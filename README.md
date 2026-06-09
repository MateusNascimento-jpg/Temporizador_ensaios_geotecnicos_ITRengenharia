# Temporizador de Prensas — ITR Engenharia

Sistema web de temporizadores para ensaios geotécnicos (prensas,
adensamento e triaxial), com sincronização em tempo real entre os
dispositivos da rede local.

## Funcionalidades
- Controle de múltiplos temporizadores em tempo real (Socket.IO)
- Estado compartilhado entre todos os dispositivos conectados
- Alertas sonoros ao fim de cada leitura
- Configuração automática de IP na rede local

## Stack
React · Tailwind CSS · Node.js · Socket.IO

## Como executar

**Back-end**
```bash
cd backend
npm install
node server.js
```

**Front-end**
```bash
cd temporizador-prensas
npm install
npm start
```

Acesse pelo navegador no endereço do servidor (ex: `http://<ip-do-servidor>:4000`).

---
© ITR Engenharia — uso interno
