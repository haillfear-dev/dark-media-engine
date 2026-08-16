# Creatomate — template bridge do Dark Engine Composer v1

> **AÇÃO MANUAL NECESSÁRIA NO CREATOMATE.** Este contrato usa apenas propriedades nativas de Template Modifications/RenderScript. O Dark Engine injeta toda a composição visual como um array RenderScript em `Composer.elements`; o template não decide o visual.

## Contrato

- Canvas vertical `1080 × 1920`, 30 fps, duração máxima 45 s.
- Configure `CREATOMATE_TEMPLATE_CONTRACT=dark-media-composer-v1`.
- Não inclua imagem, vídeo, texto, background, música ou mídia demo/default.
- Crie uma única composition vazia chamada exatamente `Composer`, ocupando o canvas e a timeline inteira. Marque sua propriedade nativa `elements` como modificável.
- O backend substitui `Composer.elements` por elementos RenderScript nativos dos tipos `video`, `image`, `shape` e `text`, cada um com `time` e `duration` absolutos.

Não são mais necessários dez grupos visuais `Scene-N.Group`. As cenas visuais, captions, overlays, branding, transforms e animations são criados dinamicamente dentro de `Composer.elements`.

## Elementos de áudio do template

### Música

Crie um elemento `audio` vazio chamado `Music` e exponha somente as propriedades nativas:

- `source`;
- `volume`;
- `time`;
- `duration`.

Ele deve iniciar sem source e com volume zero. Mood e ducking permanecem decisões internas do Dark Engine; não são enviados como propriedades fictícias. Ducking deve ser configurado no mixer/template se disponível no plano contratado do Creatomate.

### Narração ElevenLabs

Crie dez elementos de áudio/TTS, `Scene-1.VoiceOver` até `Scene-10.VoiceOver`. Configure todos no painel com o **mesmo provider ElevenLabs e a mesma voz**. O provider/voice são configuração do elemento no Creatomate, não propriedades RenderScript inventadas.

Exponha somente:

- `source` — recebe o texto da narração, conforme o comportamento TTS configurado no elemento;
- `time`;
- `duration`.

Slots sem cena recebem source vazio e duration zero. Não crie `Voice.VoiceId`.

## RenderScript injetado

Os elementos em `Composer.elements` usam apenas propriedades validadas pelo adapter:

- comuns: `type`, `name`, `time`, `duration`, `x`, `y`, `width`, `height`, `x_alignment`, `y_alignment`, `opacity`, `animations`;
- media: `source`, `fit`;
- text: `text`, `fill_color`, `font_family`, `font_weight`, `font_size`, `line_height`, `background_color`, `background_x_padding`, `background_y_padding`, `border_radius`.

As abstrações editoriais são convertidas antes do envio:

- `captionPosition` → `y`, `x_alignment` e `y_alignment` reais;
- `mediaMotion` → animations `scale` ou `move`;
- `transition` → animations `fade`, `slide` ou `scale`; `CUT` não adiciona animation;
- overlay → elemento `shape` com `fill_color` e `opacity`;
- branding → elemento `text` com propriedades tipográficas nativas;
- música → `Music.source`, `volume`, `time`, `duration`;
- narração → source/time/duration dos slots TTS pré-configurados.

## Checklist

1. Render sem modifications deve ficar vazio/neutro e silencioso.
2. `Composer.elements` deve aceitar substituição por array.
3. `Music` deve estar vazio e silencioso por padrão.
4. Os dez slots VoiceOver devem usar exatamente a mesma voz ElevenLabs.
5. Nenhum elemento pode conter conteúdo demo, mar, paisagem ou placeholder.
6. Confirme captions dentro da safe area vertical em um teste semântico no painel.
7. Só então configure `CREATOMATE_TEMPLATE_ID`.

O backend rejeita propriedades fora do allowlist do adapter, mídia ausente/duplicada/demo, contrato legado, timeline inconsistente e narração excessiva antes do POST de render.

Configure também `CREATOMATE_VOICE_ID` o backend aplica esse identificador ao RenderPlan após a geração. A IA não escolhe IDs internos; o identificador serve somente para validação local e **não** é enviado como uma propriedade RenderScript.

## Auditoria das propriedades removidas

| Propriedade anterior | Motivo | Substituição |
|---|---|---|
| `Scene-N.Media.motion` | abstração, não propriedade de media | objetos nativos em `animations` do elemento injetado |
| `Scene-N.Caption.position` | enum editorial, não propriedade de text | `x`, `y`, `x_alignment`, `y_alignment` |
| `Scene-N.Caption.style` | nome abstrato sem contrato RenderScript | propriedades tipográficas `font_*`, `fill_color` e background |
| `Scene-N.Caption.emphasis` | array editorial sem propriedade equivalente direta | permanece no RenderPlan; não é enviado até existir renderer segmentado por spans |
| `Scene-N.Transition.type` | helper fictício | animation nativa; CUT produz ausência de animation |
| `Music.metadata` | metadata fictícia do adapter antigo | removida; somente source/volume/time/duration |
| `Voice.VoiceId` | provider/voz não são definidos por esse campo | voz configurada nos elementos TTS do template e validada localmente por `CREATOMATE_VOICE_ID` |

### Referências oficiais usadas no contrato

- Creatomate API — Create a render: <https://creatomate.com/docs/api/reference/create-a-render>
- RenderScript: <https://creatomate.com/docs/json/introduction>
- Elements: <https://creatomate.com/docs/json/elements>
- Animations: <https://creatomate.com/docs/json/animations>
