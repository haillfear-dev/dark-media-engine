# YouTube Shorts

Implementação baseada no OAuth 2.0 web-server do Google e YouTube Data API v3. Referências oficiais: [OAuth 2.0 para web server](https://developers.google.com/identity/protocols/oauth2/web-server), [upload de vídeo](https://developers.google.com/youtube/v3/guides/uploading_a_video) e [`videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert).

## O que funciona agora

- Authorization URL com state, acesso offline e scopes `youtube.upload` e `youtube.readonly`.
- Code exchange, refresh, revogação e consulta do canal autenticado.
- Upload resumable inicializado em `videos.insert` e envio do MP4 para a URL de sessão retornada.
- Upload começa como `private`; retorno guarda `videoId` e permanece `PROCESSING`, sem declarar publicação antes da confirmação.
- Publication possui idempotência e erro independente do TikTok.

## O que depende de configuração ou aprovação externa

São necessários `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `TOKEN_ENCRYPTION_KEY`, YouTube Data API v3 habilitada, OAuth consent screen e redirect autorizado. Quota, verificação do app e regras de privacidade dependem da configuração Google.

Este ambiente não forneceu credenciais nem acesso de rede ao provider; upload e callback não foram certificados end-to-end. Antes de produção, revalide políticas, quota, escopos e comportamento de processamento na documentação oficial atual.
