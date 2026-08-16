# Creatomate template — Dark Engine Video Composer v1

> **AÇÃO MANUAL NECESSÁRIA NO CREATOMATE.** O projeto usa a API de renderização, não a API/editor do painel para criar templates. Crie o template abaixo no painel antes de definir `CREATOMATE_TEMPLATE_ID`.

## Contrato obrigatório

- Canvas: `1080 × 1920`, 30 fps, fundo neutro preto (`#080512`), duração máxima 45 s.
- `CREATOMATE_TEMPLATE_CONTRACT=dark-media-composer-v1`.
- Não inclua imagem, vídeo, texto de demonstração, mar, paisagem ou mídia default. Todo elemento dinâmico deve iniciar vazio; grupos de cenas iniciam com opacity `0`.
- Crie **10 grupos** contíguos, nomeados `Scene-1.Group` até `Scene-10.Group`. Cada grupo precisa aceitar `time`, `duration` e `opacity` dinamicamente. Eles não devem sobrepor a timeline quando seus valores forem atualizados.

## Elementos globais dinâmicos

| Nome exato | Tipo | Inicial | Propriedades dinâmicas |
|---|---|---|---|
| `Brand.Name` | Text | vazio | `text` |
| `Brand.Accent` | Shape | `#D7FF54` | `fill_color` |
| `Brand.Font` | Text style/helper | Inter | `font_family` |
| `Brand.Logo` | Image | source vazio, opacity 0 | `source`, `opacity` |
| `Music` | Audio | source vazio, volume 0 | `source`, `volume`, `metadata` |
| `Voice` | template/TTS config | ElevenLabs | `VoiceId` |

Use uma única voz ElevenLabs para todos os elementos de voice-over. Configure a voz no template e replique a mesma configuração em cada slot.

## Estrutura de cada cena

Repita `N=1…10`, sem conteúdo inicial:

| Nome exato | Tipo | Inicial | Propriedades dinâmicas |
|---|---|---|---|
| `Scene-N.Group` | Composition/group | opacity 0 | `time`, `duration`, `opacity` |
| `Scene-N.Media` | Video/Image | source vazio | `source`, `duration`, `fit`, `motion` |
| `Scene-N.Headline` | Text | vazio | `text`, `fill_color` |
| `Scene-N.Caption` | Text | vazio | `text`, `position`, `style`, `emphasis` |
| `Scene-N.VoiceOver` | Audio/TTS | source vazio | `source`, `duration` |
| `Scene-N.Transition` | transition helper | CUT | `type` |
| `Scene-N.Overlay` | black shape | opacity 0 | `opacity` |

`Media` deve preencher o canvas e ficar atrás de overlay/textos. `Headline`, `Caption` e branding ficam na safe area: 120 px das laterais, 180 px do topo e 300 px da base. Caption deve ter alto contraste, sombra/placa escura, máximo de três linhas e tamanho equivalente a 48–60 px em 1080×1920. TOP/CENTER/BOTTOM devem mapear para posições seguras, não para as bordas físicas.

Mapeie motions `NONE`, `SLOW_ZOOM_IN`, `SLOW_ZOOM_OUT`, `PAN_LEFT`, `PAN_RIGHT` e transitions `CUT`, `FADE`, `SLIDE`, `ZOOM`. Se o editor exigir animações pré-configuradas, crie variantes dentro do slot e faça a propriedade dinâmica selecionar a variante; não deixe nenhuma ativa como fallback visível.

## Slots não utilizados

O Dark Engine envia opacity `0`, media source vazio e todos os textos/voice-over vazios para slots acima do total de cenas. Mesmo assim, valide no painel que um render com seis cenas não mostra qualquer elemento dos slots 7–10.

## Checklist antes de liberar créditos

1. Render de teste sem modifications resulta apenas em canvas neutro, nunca em mídia demo.
2. Cada nome acima aparece exatamente, incluindo maiúsculas e pontos.
3. Cenas aceitam `time` e `duration` independentes e totalizam 30–45 s.
4. Uma URL diferente em cada `Media.source` troca visualmente cada cena.
5. Captions estão dentro da safe area em celular.
6. ElevenLabs lê o texto recebido em `VoiceOver.source` usando a voz única configurada.
7. Música vazia permanece silenciosa; não configure faixa default.

Somente depois desse checklist copie o ID para `CREATOMATE_TEMPLATE_ID`. O backend recusará contrato legado, mídia faltante/duplicada/demo, timeline inconsistente e narração maior que a cena antes de chamar a API de renders.
