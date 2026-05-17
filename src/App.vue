<template>
  <div id="app" class="container">
    <header class="main-header">
      <h1>{{ $t('header.title') }} </h1>
      <p>{{ $t('header.subtitle') }}</p>
      
      <div class="lang-switcher">
        <button @click="$i18n.locale = 'pt'" :class="{ active: $i18n.locale === 'pt' }" class="btn-lang">🇧🇷 PT</button>
        <button @click="$i18n.locale = 'en'" :class="{ active: $i18n.locale === 'en' }" class="btn-lang">🇺🇸 EN</button>
      </div>
    </header>

    <div class="dashboard-grid">
      <section class="card inventory-card">
        <div class="card-header">
          <h2>{{ $t('inventory.title') }}</h2>
        </div>
        <div class="form-group inline">
          <input v-model="newRM.name" :placeholder="$t('inventory.namePlaceholder')" class="pro-input" />
          <input v-model.number="newRM.quantity" type="number" :placeholder="$t('inventory.qtyPlaceholder')" class="pro-input qty" />
          <button @click="addRawMaterial" class="btn btn-add">{{ $t('inventory.btnAdd') }}</button>
        </div>
        <ul class="pro-list">
          <li v-for="rm in rawMaterials" :key="rm.id" class="list-item">
            <div class="info">
              <span class="id-badge">#{{ rm.id }}</span>
              <span class="name">{{ rm.name }}</span>
              <span class="stock-qty">{{ rm.quantity }} <small>un.</small></span>
            </div>
            <div class="actions">
              <button @click="editRM(rm)" class="btn-icon edit">✏️</button>
              <button @click="deleteRM(rm.id)" class="btn-icon delete">🗑️</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="card product-card">
        <div class="card-header">
          <h2>{{ $t('product.title') }}</h2>
        </div>
        <div class="form-group vertical">
          <div class="input-with-label">
            <label>{{ $t('product.nameLabel') }}</label>
            <input v-model="newProduct.name" placeholder="Ex: Cadeira Office" class="pro-input" />
          </div>

          <div class="input-with-label">
            <label>{{ $t('product.priceLabel') }}</label>
            <div class="price-input-wrapper">
              <span class="currency-prefix">R$</span>
              <input v-model.number="newProduct.price" type="number" step="0.01" placeholder="0,00" class="pro-input price-input" />
            </div>
          </div>
          
          <div class="recipe-section">
            <label>{{ $t('product.recipeLabel') }}</label>
            <div class="recipe-input-group">
              <select v-model="tempRMId" class="pro-input">
                <option :value="null" disabled>{{ $t('product.selectMaterial') }}</option>
                <option v-for="rm in rawMaterials" :key="rm.id" :value="rm.id">
                  {{ rm.name }}
                </option>
              </select>
              <input v-model.number="tempQty" type="number" :placeholder="$t('inventory.qtyPlaceholder')" class="pro-input qty" />
              <button @click="addToRecipe" class="btn btn-secondary btn-plus-spacing">+</button>
            </div>
            
            <div class="recipe-tags" v-if="Object.keys(currentRecipe).length > 0">
              <span v-for="(qty, id) in currentRecipe" :key="id" class="tag">
                {{ qty }} {{ getRMName(id) }}
                <button @click="removeFromRecipe(id)" class="tag-close">×</button>
              </span>
            </div>
          </div>
          <button @click="addProduct" class="btn btn-primary full-width">{{ $t('product.btnSave') }}</button>
        </div>
      </section>

      <section class="card full-width catalog-card">
        <div class="card-header">
          <h2>{{ $t('catalog.title') }}</h2>
        </div>
        <div class="pro-table-wrapper">
        <table class="pro-table">
          <thead>
            <tr>
              <th>{{ $t('catalog.colId') }}</th>
              <th>{{ $t('catalog.colName') }}</th>
              <th>{{ $t('catalog.colComp') }}</th>
              <th>{{ $t('catalog.colPrice') }}</th>
              <th>{{ $t('catalog.colActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id">
              <td><span class="id-badge">#{{ p.id }}</span></td>
              <td><strong>{{ p.name }}</strong></td>
              <td>
                <div class="mini-recipe">
                  <span v-for="(qty, materialName) in p.composition" :key="materialName" class="mini-tag">
                    {{ qty }} {{ materialName }}
                  </span>
                </div>
              </td>
              <td class="price-cell">R$ {{ p.price.toFixed(2) }}</td>
              <td>
                <button @click="deleteProduct(p.id)" class="link-delete">{{ $t('catalog.btnDelete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>

      <section class="card full-width highlight-card">
        <div class="optimize-content">
          <div class="text">
            <h2>{{ $t('optimize.title') }}</h2>
            <p>{{ $t('optimize.subtitle') }}</p>
          </div>
          <button @click="getProductionSuggest" class="btn btn-optimize">{{ $t('optimize.btnCalculate') }}</button>
        </div>
        
        <div v-if="Object.keys(suggestion).length > 0" class="suggestion-container">
          <div class="total-profit-badge">
            <small>{{ $t('optimize.totalProfit') }}</small>
            <div class="value">R$ {{ calculateTotalProfit() }}</div>
          </div>

          <div class="suggestion-results-centered">
            <div v-for="(qty, name, index) in suggestion" :key="name" class="suggestion-item">
              <div class="order-number">{{ index + 1 }}º</div>
              <div class="suggestion-info">
                <span class="suggestion-qty">{{ qty }} {{ $t('optimize.units') }}</span>
                <span class="suggestion-name">{{ name }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://factory-manager-api.onrender.com'
});

const rawMaterials = ref([]);
const products = ref([]);
const suggestion = ref({});
const newRM = ref({ name: '', quantity: 0 });
const newProduct = ref({ name: '', price: 0 });
const currentRecipe = ref({});
const tempRMId = ref(null);
const tempQty = ref(null);

const fetchData = async () => {
  try {
    const [resRM, resP] = await Promise.all([
      api.get('/raw-materials'),
      api.get('/products')
    ]);
    rawMaterials.value = resRM.data;
    products.value = resP.data;
  } catch (e) { console.error("Erro ao carregar dados", e); }
};

const getRMName = (id) => {
  const rm = rawMaterials.value.find(m => m.id == id);
  return rm ? rm.name : `Mat. #${id}`;
};

const calculateTotalProfit = () => {
  let total = 0;
  for (const [name, qty] of Object.entries(suggestion.value)) {
    const product = products.value.find(p => p.name === name);
    if (product) total += product.price * qty;
  }
  return total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

const addRawMaterial = async () => {
  if (!newRM.value.name) return;
  await api.post('/raw-materials', newRM.value);
  newRM.value = { name: '', quantity: 0 };
  fetchData();
};

const deleteRM = async (id) => {
  if (!confirm("Excluir material?")) return;
  try {
    await api.delete(`/raw-materials/${id}`);
    fetchData();
  } catch (e) { alert("Erro: Material em uso por um produto."); }
};

const editRM = async (rm) => {
  const newQty = prompt(`Nova quantidade para ${rm.name}:`, rm.quantity);
  if (newQty !== null) {
    await api.put(`/raw-materials/${rm.id}`, { name: rm.name, quantity: parseFloat(newQty) });
    fetchData();
  }
};

const addToRecipe = () => {
  if (tempRMId.value && tempQty.value) {
    currentRecipe.value[tempRMId.value] = tempQty.value;
    tempRMId.value = null;
    tempQty.value = null;
  }
};

const removeFromRecipe = (id) => delete currentRecipe.value[id];

const addProduct = async () => {
  if (!newProduct.value.name || Object.keys(currentRecipe.value).length === 0) {
    alert("Preencha o nome e adicione materiais à receita!");
    return;
  }
  const payload = {
    name: newProduct.value.name,
    price: newProduct.value.price,
    composition: currentRecipe.value
  };
  try {
    await api.post('/products', payload);
    newProduct.value = { name: '', price: 0 };
    currentRecipe.value = {};
    fetchData();
    alert("✅ Produto salvo com sucesso!");
  } catch (e) { alert("❌ Erro ao salvar."); }
};

const deleteProduct = async (id) => {
  if (confirm("Remover do catálogo?")) {
    await api.delete(`/products/${id}`);
    fetchData();
  }
};

const getProductionSuggest = async () => {
  const res = await api.get('/api/production/suggest');
  suggestion.value = res.data;
};

onMounted(fetchData);
</script>

<style>
:root {
  --primary: #2563eb;
  --success: #10b981;
  --danger: #ef4444;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text-main: #1e293b;
  --border: #e2e8f0;
}

* {
  box-sizing: border-box;
}

body {
  background: var(--bg);
  color: var(--text-main);
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
}

.container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px;
}

.main-header {
  text-align: center;
  margin-bottom: 40px;
}

.main-header h1 {
  font-size: 2.2rem;
  margin-bottom: 10px;
}

.main-header p {
  color: #64748b;
  margin: 0;
}

.lang-switcher {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.btn-lang {
  background: white;
  border: 1px solid var(--border);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-lang.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-lang:hover:not(.active) {
  background: #f1f5f9;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.full-width {
  grid-column: 1 / -1;
}

.card {
  background: var(--card-bg);
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  border: 1px solid var(--border);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

.card-header h2 {
  font-size: 1.25rem;
  margin: 0;
}

.input-with-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.input-with-label label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.price-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.currency-prefix {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  font-weight: 600;
}

.price-input {
  padding-left: 40px !important;
}

.pro-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.95rem;
  background: white;
}

.qty {
  width: 100px;
}

.form-group.inline {
  display: flex;
  gap: 10px;
  align-items: center;
}

.form-group.vertical {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recipe-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.recipe-tags {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-plus-spacing {
  min-width: 45px;
}

.mini-recipe {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mini-tag {
  font-size: 0.75rem;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-weight: 500;
  color: #475569;
}

.pro-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

.pro-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.pro-table th {
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid var(--border);
  color: #64748b;
  font-size: 0.85rem;
}

.pro-table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--border);
}

.price-cell {
  font-weight: 600;
  color: var(--success);
}

.highlight-card {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.optimize-content {
  margin-bottom: 25px;
  text-align: center;
}

.suggestion-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.total-profit-badge {
  background: rgba(255,255,255,0.2);
  padding: 15px;
  border-radius: 12px;
  text-align: center;
  width: fit-content;
}

.total-profit-badge .value {
  font-size: 2.2rem;
  font-weight: 900;
}

.suggestion-results-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.suggestion-item {
  background: white;
  padding: 15px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  color: var(--text-main);
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.order-number {
  background: #10b981;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.suggestion-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.suggestion-qty {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--success);
}

.suggestion-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.btn {
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-secondary {
  background: var(--text-main);
  color: white;
}

.btn-optimize {
  background: white;
  color: var(--success);
  font-size: 1.1rem;
  padding: 15px 30px;
  border: none;
}

.btn:hover {
  transform: translateY(-1px);
}

.tag {
  background: #dbeafe;
  color: #1e40af;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.tag-close {
  background: none;
  border: none;
  color: #1e40af;
  margin-left: 8px;
  cursor: pointer;
  font-weight: bold;
}

.link-delete {
  color: var(--danger);
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.pro-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  gap: 10px;
}

.info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
}

.id-badge {
  background: #e2e8f0;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
}

.stock-qty {
  font-weight: 700;
  color: var(--primary);
}

.full-width button {
  max-width: 100%;
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .container {
    padding: 20px 14px;
  }

  .card {
    padding: 18px;
  }
}

@media (max-width: 768px) {
  .main-header h1 {
    font-size: 1.7rem;
  }

  .form-group.inline {
    flex-direction: column;
    align-items: stretch;
  }

  .recipe-input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .qty {
    width: 100%;
  }

  .btn {
    width: 100%;
  }

  .btn-plus-spacing {
    margin-left: 0 !important;
  }

  .optimize-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .suggestion-item {
    max-width: 100%;
  }

  .pro-table {
    min-width: 650px;
  }
}

@media (max-width: 480px) {
  .main-header h1 {
    font-size: 1.4rem;
  }

  .main-header p {
    font-size: 0.9rem;
  }

  .card-header h2 {
    font-size: 1rem;
  }

  .total-profit-badge .value {
    font-size: 1.7rem;
  }

  .suggestion-qty {
    font-size: 1rem;
  }

  .btn-optimize {
    font-size: 1rem;
    padding: 12px;
  }
}
</style>