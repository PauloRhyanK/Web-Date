# Our Isometric World

Ambiente virtual isométrico para casais em relação à distância: avatares em tempo real, vídeo e áudio via WebRTC (PeerJS) e música de fundo.

## Como rodar

```bash
npm install
npm run dev
```

Abra o URL mostrado no terminal (ex.: `http://localhost:5173`). Quem abrir primeiro é o **Player 1**; use **Copiar link da sala** e envie o link ao parceiro (**Player 2**).

## Configuração do Firebase

1. Crie um projeto em [Firebase Console](https://console.firebase.google.com/).
2. Ative o **Realtime Database** (Create Database; pode começar em modo teste).
3. Em **Project settings** > **Your apps**, adicione uma app Web e copie o objeto `firebaseConfig`.
4. Crie um ficheiro `.env` na raiz do projeto (use `.env.example` como base) e preencha:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Pixel art (sprites e cenário)

Para bonecos e cenário em pixel art, coloque as imagens em:

- **`public/sprites/player1.png`** — sprite sheet do jogador local ("Tu"). Formato: frames em linha horizontal; 4 frames de 32×48 px (imagem total 128×48). Frame 0 = parado, frames 1–3 = caminhada.
- **`public/sprites/player2.png`** — sprite sheet do parceiro ("Par"). Mesma convenção (ex.: 4 frames de 32×48 px).
- **`public/scenario.png`** — cenário da sala. Tamanho sugerido: 400×400 px (cobre o chão isométrico).

Se os ficheiros não existirem ou falharem a carregar, a app usa o visual de fallback (avatares com cabeça/corpo e grid de tiles).

## Personagem 3D (Three.js)

Para usar personagens 3D com animação skeletal (idle/walk) em vez dos sprites ou do fallback:

- Coloque um ficheiro **`public/models/character.glb`** (formato glTF 2.0 binário).
- O modelo deve ter **skinning** (esqueleto) e pelo menos dois **AnimationClips** com nomes que a app reconhece:
  - **Idle:** um de `"Idle"`, `"idle"`, `"IDLE"`.
  - **Walk:** um de `"Walk"`, `"walk"`, `"Walking"`, `"walking"`.
- Se o ficheiro não existir ou falhar a carregar, a app usa automaticamente a sala 2D (tiles + avatares em CSS/sprites).

Sugestão de modelos: [glTF Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models) ou modelos com animações do [Mixamo](https://www.mixamo.com/) exportados em glTF.

## Como usar

- **Movimento:** WASD ou setas (teclado).
- **Vídeo/áudio:** Permita câmera e microfone; o Player 2 liga-se automaticamente ao Player 1. Vídeos aparecem nos cantos superiores (esquerdo = Tu, direito = Parceiro; local mutado, remoto com som).
- **Música:** Clique em **Play música** para iniciar a música de fundo (obrigatório para desbloquear autoplay no browser). Coloque um ficheiro `music.mp3` em `public/` para ter música (ou edite `App.jsx` para usar outro URL).

## PeerJS em produção

Por defeito usa o servidor público (`0.peerjs.com`), que pode ter limites. Para uso contínuo, configure um [PeerJS Server](https://github.com/peers/peerjs-server) ou um serviço cloud e defina `VITE_PEERJS_HOST` no `.env`.

## Deploy na Vercel

1. Envie o projeto para um repositório Git (GitHub, GitLab ou Bitbucket).
2. Em [vercel.com](https://vercel.com), **Add New Project** e importe o repositório.
3. A Vercel deteta Vite automaticamente (`Build Command`: `npm run build`, **Output Directory**: `dist`). Não é preciso alterar.
4. **Environment Variables:** em **Settings → Environment Variables** adicione as mesmas variáveis que usa no `.env` local (são injetadas no build; o Vite expõe as que começam por `VITE_`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - (opcional) `VITE_PEERJS_HOST` se usar servidor PeerJS próprio
5. **Deploy.** O link da sala (ex.: `https://seu-projeto.vercel.app/?room=abc123`) funciona igual; partilhe esse URL com o parceiro.

O ficheiro `vercel.json` na raiz configura o rewrite para SPA (todas as rotas servem `index.html`), para que links diretos continuem a funcionar.

## Stack

- **Frontend:** React (Vite), Tailwind CSS  
- **Estado/posições:** Firebase Realtime Database  
- **Vídeo e áudio:** PeerJS (WebRTC)
