# TikTok — upload para revisão

Implementação baseada no **Content Posting API / Upload API** e OAuth v2 oficiais. Referências que devem ser revalidadas antes de produção: [Upload API getting started](https://developers.tiktok.com/doc/content-posting-api-get-started-upload-content/), [Content Posting API](https://developers.tiktok.com/products/content-posting-api/) e [User access token management](https://developers.tiktok.com/doc/oauth-user-access-token-management/).

## O que funciona agora

- Provider backend isolado da UI.
- Authorization URL com proteção CSRF por `state` e PKCE `S256`; o `code_verifier` fica criptografado somente no backend durante o fluxo.
- Scopes mínimos do fluxo implementado: `user.info.basic` e `video.upload`.
- Code exchange, leitura de identidade, refresh e revogação.
- Inicialização oficial do upload de inbox por `POST /v2/post/publish/inbox/video/init/` com `FILE_UPLOAD`.
- Upload do MP4 no `upload_url` retornado pelo TikTok.
- Resultado persistido como `SENT_FOR_REVIEW`, nunca `PUBLISHED`, pois o operador ainda conclui a revisão/publicação no TikTok.
- Primeiro uploader local usa um único chunk e limita o envio TikTok a 64 MB; Asset local pode ter até 500 MB.

## O que depende de configuração ou aprovação externa

São necessários `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` e `TOKEN_ENCRYPTION_KEY`. O app TikTok precisa habilitar Login Kit/Content Posting e ter o redirect aprovado. Disponibilidade de upload, contas elegíveis, limites e auditoria dependem do status do app no portal TikTok.

Este ambiente não forneceu credenciais nem acesso de rede à documentação/provider; portanto o fluxo não foi certificado end-to-end. Antes de usar uma conta real, revalide endpoints, scopes, limites de chunk, UX exigida, políticas e status de auditoria contra a documentação oficial vigente.
