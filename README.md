# AIDATA

Dépôt initial pour le projet `AIDATA`.

Instructions rapides :

- Pour créer le dépôt distant avec la CLI GitHub :
  - `gh repo create AIDATA --public --source=. --remote=origin --push`
- Ou créer le dépôt via https://github.com/new et ajouter le remote :
  - `git remote add origin https://github.com/<votre-utilisateur>/AIDATA.git`
  - `git push -u origin main`

Voir `package.json` pour les scripts de développement (utilise Vite).

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/195SAHVQmEePPpFF3nepdpQOKldNUrcU6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
