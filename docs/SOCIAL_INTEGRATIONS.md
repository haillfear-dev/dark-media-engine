# Integrações sociais

## O que funciona agora

- Tela operacional para TikTok, YouTube, Instagram, Facebook e Kwai.
- Estados honestos: `NOT_CONFIGURED`, `CONFIGURED`, `CONNECTED`, `TOKEN_EXPIRED` e `ERROR`.
- OAuth state aleatório, hash persistido, cookie HttpOnly/SameSite, expiração de dez minutos e consumo único.
- Tokens backend-only cifrados com AES-256-GCM; a chave vem de `TOKEN_ENCRYPTION_KEY`.
- Asset MP4 é validado por MIME, tamanho e assinatura, armazenado fora do banco e servido para preview por rota backend.
- Uma Publication por canal, com `provider`, `assetId`, status, provider status, external id, erro e metadata.
- Chave única derivada de provider + variant + asset impede envio duplicado.
- Falha em um provider não impede outro. Erros são persistidos como códigos operacionais, sem stack trace na UI.

## O que depende de credenciais e aprovação externa

TikTok e Google exigem aplicações, redirect URIs, consentimento e, conforme o caso, revisão/aprovação do produto. Nenhuma chamada foi validada com credenciais reais neste repositório. A tela permanece `NOT_CONFIGURED` sem todos os valores necessários e jamais simula conexão ou upload.

Instagram, Facebook e Kwai aparecem como `EM BREVE`; não existem botões falsos de conexão.

## Segurança local

O redirect cadastrado deve coincidir exatamente com o `.env`. Localhost é apropriado apenas para desenvolvimento quando aceito pelo provider. Não exponha `data/`, `storage/`, `.env` ou a encryption key; perda da chave torna tokens existentes ilegíveis. Em produção, use HTTPS, autenticação do operador, secret manager, rotação de chaves, CSP, proteção de upload, malware scan e storage privado.
