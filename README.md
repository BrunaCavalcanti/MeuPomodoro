# 🍅 Pomodoro Timer
Um timer Pomodoro feito com HTML, CSS e JavaScript puro — sem frameworks, sem dependências externas. Interface moderna com calendário semanal, análises de foco e histórico completo de sessões.

---

## ✨ Funcionalidades
- ⏱ **Timer Pomodoro** — modos Foco e Pausa com anel de progresso animado (SVG)
- 🔔 **Notificações** — beep sonoro e notificação do sistema ao fim de cada sessão
- 🎯 **Tópico do dia** — defina o tema de estudo e associe às sessões
- 🏷️ **Tags de sessão** — categorize cada sessão com tags personalizáveis
- 💾 **Salvar sessão manualmente** — registre sessões sem precisar completar o timer
- 📅 **Calendário semanal** — veja seus dias de foco com popups de detalhes
- 📊 **Análises** — total de sessões, minutos focados, dias ativos, sequência atual e heatmap dos últimos 70 dias
- 📋 **Histórico completo** — todas as sessões agrupadas por dia, com filtro por tag
- 🗑️ **Deletar sessões** — remova qualquer registro do histórico

---

## 📁 Estrutura do Projeto
```
pomodoro/
│
├── index.html        # Estrutura da página e marcação HTML
│
├── css/
│   └── style.css     # Variáveis de tema, layout, componentes e responsividade
│
├── js/
│   └── app.js        # Toda a lógica: timer, tags, sessões, renderização e navegação
│
└── img/
    └── fundo.png     # Imagem de fundo (xadrez azul aquarelado)
```

---

## 🚀 Como usar
Não precisa instalar nada. É só abrir!
1. Clone ou baixe o repositório:
   ```bash
   git clone https://github.com/seu-usuario/pomodoro.git
   ```

2. Abra o arquivo `index.html` diretamente no navegador.

> ⚠️ Para as notificações do sistema funcionarem, o navegador precisará pedir sua permissão na primeira abertura.

---

## ⌨️ Como funciona o Timer
1. Escolha o modo **Foco** ou **Pausa**
2. Selecione a duração (5, 10, 15, 30 ou 60 minutos)
3. Adicione uma **tag** para identificar o que você está estudando
4. Clique em **▶** para iniciar
5. Ao fim, a sessão é salva automaticamente no histórico

---

## 🏷️ Tags
- As tags padrão incluem: Cálculo, Escrita, Redação, Programação, Leitura, Inglês, Física, Revisão, Projeto
- Você pode **adicionar** ou **remover** tags clicando em "✏️ Editar tags"
- As tags personalizadas ficam salvas no `localStorage`

---

## 📊 Abas
| Aba | O que mostra |
|-----|-------------|
| ⏱ Timer | Timer principal + calendário semanal + sessões de hoje + recentes |
| 📊 Análises | Totais gerais, heatmap de 70 dias, ranking de tags |
| 📋 Histórico | Todas as sessões agrupadas por data, com filtro por tag |

---

## 🛠️ Tecnologias utilizadas
- **HTML5** — estrutura semântica
- **CSS3** — variáveis CSS, layout em grid/flexbox, animações
- **JavaScript (ES6+)** — lógica completa sem frameworks
- **Web Audio API** — beep sonoro ao fim do timer
- **Notifications API** — notificações do sistema operacional
- **localStorage** — persistência de sessões, tags e tópico do dia

---

## 📱 Responsividade
Em telas menores que 700px, a coluna da direita (calendário e recentes) é ocultada, deixando o foco no timer. A página de Análises adapta o grid de 4 para 2 colunas.

---

## 👩‍💻 Autora
Feito por **Bruna Cavalcanti** — estudante de Ciência da Computação, focada em front-end.
Sinta-se à vontade para usar ou reaproveitar!
