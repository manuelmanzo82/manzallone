# 🦁 ManzAllone

App per il tracking alimentazione, peso e movimento per Manuel & Carmen.

## 🚀 Deploy su Vercel (Metodo Facile)

### Opzione 1: Deploy diretto da ZIP

1. Vai su [vercel.com](https://vercel.com) e accedi (puoi usare GitHub, Google, ecc.)
2. Clicca **"Add New..."** → **"Project"**
3. Scegli **"Import Third-Party Git Repository"** OPPURE:
   - Carica questo progetto su GitHub
   - Poi importalo da lì

### Opzione 2: Deploy da GitHub (Consigliato)

1. **Crea un repository su GitHub:**
   - Vai su [github.com/new](https://github.com/new)
   - Nome: `manzallone`
   - Clicca "Create repository"

2. **Carica i file:**
   - Puoi trascinare tutti i file direttamente nella pagina GitHub
   - Oppure usa git da terminale

3. **Collega a Vercel:**
   - Vai su [vercel.com/new](https://vercel.com/new)
   - Clicca "Import Git Repository"
   - Seleziona `manzallone`
   - Clicca **"Deploy"**

4. **Fatto!** 🎉
   - Vercel ti darà un URL tipo: `manzallone.vercel.app`
   - Ogni push su GitHub = deploy automatico

## 📱 Aggiungere alla Home del telefono

### iPhone:
1. Apri Safari → vai all'URL dell'app
2. Tocca l'icona "Condividi" (quadrato con freccia)
3. Scorri e tocca "Aggiungi alla schermata Home"

### Android:
1. Apri Chrome → vai all'URL dell'app
2. Tocca i 3 puntini in alto a destra
3. Tocca "Aggiungi a schermata Home"

## 🛠 Sviluppo locale

```bash
npm install
npm run dev
```

Apri http://localhost:5173

## 📁 Struttura

```
manzallone-app/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    └── App.jsx
```
