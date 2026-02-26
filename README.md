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

## Como usar

- **Movimento:** WASD ou setas (teclado).
- **Vídeo/áudio:** Permita câmera e microfone; o Player 2 liga-se automaticamente ao Player 1. Vídeos aparecem no canto inferior direito (local mutado, remoto com som).
- **Música:** Clique em **Play música** para iniciar a música de fundo (obrigatório para desbloquear autoplay no browser). Coloque um ficheiro `music.mp3` em `public/` para ter música (ou edite `App.jsx` para usar outro URL).

## PeerJS em produção

Por defeito usa o servidor público (`0.peerjs.com`), que pode ter limites. Para uso contínuo, configure um [PeerJS Server](https://github.com/peers/peerjs-server) ou um serviço cloud e defina `VITE_PEERJS_HOST` no `.env`.

## Stack

- **Frontend:** React (Vite), Tailwind CSS  
- **Estado/posições:** Firebase Realtime Database  
- **Vídeo e áudio:** PeerJS (WebRTC)
