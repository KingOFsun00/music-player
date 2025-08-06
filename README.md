# 🎵 DJ Mixer Pro

Uma plataforma profissional completa para mixagem de música e criação de batidas, desenvolvida com tecnologias web modernas e otimizada para GitHub Pages.

## ✨ Características

### 🎛️ Player Avançado
- Reprodução de múltiplas faixas simultâneas
- Controles profissionais (play, pause, próximo, anterior)
- Barra de progresso interativa com buffer visual
- Sistema de volume master com controle preciso
- Modo loop e shuffle

### 🎚️ Mixer Profissional
- Dois decks independentes (A e B)
- Controle de volume individual por deck
- Pontos de Cue para mixagem precisa
- Crossfader virtual

### 🎛️ Equalizador de 5 Bandas
- Frequências: 60Hz, 250Hz, 1KHz, 4KHz, 16KHz
- Predefinições profissionais (Rock, Pop, Eletrônico, etc.)
- Controle preciso de -12dB a +12dB
- Reset rápido para configuração flat

### 🎪 Efeitos de Áudio
- **Redução de Ruído**: Filtro passa-baixa inteligente
- **Reverb**: Reverberação sintética de alta qualidade
- **Echo**: Delay com feedback controlado
- **Compressor**: Compressão dinâmica profissional
- **Flanger**: Efeito de modulação (em desenvolvimento)
- **Phaser**: Efeito de fase (em desenvolvimento)

### 🥁 Drum Pad Profissional
- 9 pads com sons de bateria de alta qualidade
- Controle via teclado (teclas A-L)
- Sons sintéticos como fallback
- Animações visuais responsivas

### 📊 Visualizador de Áudio
- Análise de frequência em tempo real
- 6 temas de cores personalizáveis
- Animações suaves e responsivas
- Otimizado para performance

### 🎨 Interface Moderna
- Design responsivo para todos os dispositivos
- Tema escuro/claro com transições suaves
- Glassmorphism e efeitos visuais avançados
- Acessibilidade completa (ARIA, navegação por teclado)

## 🚀 Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessível
- **CSS3**: Design moderno com CSS Grid, Flexbox e Custom Properties
- **JavaScript ES6+**: Programação orientada a objetos e APIs modernas
- **Web Audio API**: Processamento de áudio profissional
- **Canvas API**: Visualizações gráficas em tempo real
- **PWA**: Suporte a Progressive Web App

## 📱 Compatibilidade

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Dispositivos móveis (iOS/Android)

## 🎹 Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `Espaço` | Play/Pause |
| `←` | Faixa anterior |
| `→` | Próxima faixa |
| `↑` | Aumentar volume |
| `↓` | Diminuir volume |
| `M` | Mute/Unmute |
| `L` | Toggle Loop |
| `S` | Toggle Shuffle |
| `A-L` | Drum Pad |

## 🛠️ Instalação

### GitHub Pages
1. Faça fork deste repositório
2. Vá em Settings > Pages
3. Selecione "Deploy from a branch"
4. Escolha "main" branch
5. Acesse via `https://seuusuario.github.io/dj-mixer-pro`

### Local
\`\`\`bash
git clone https://github.com/seuusuario/dj-mixer-pro.git
cd dj-mixer-pro
# Abra index.html em um servidor local
python -m http.server 8000
# ou
npx serve .
\`\`\`

## 📁 Estrutura de Arquivos

\`\`\`
dj-mixer-pro/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # JavaScript principal
├── sw.js              # Service Worker
├── manifest.json      # PWA Manifest
├── README.md          # Documentação
└── musicas/           # Pasta para arquivos de música
    ├── exemplo1.mp3
    ├── exemplo2.mp3
    └── ...
\`\`\`

## 🎵 Adicionando Suas Músicas

1. Crie uma pasta `musicas/` na raiz do projeto
2. Adicione seus arquivos MP3
3. Edite o array `playlist` em `script.js`:

\`\`\`javascript
playlist: [
    { 
        title: "Sua Música", 
        artist: "Seu Artista", 
        duration: "3:45", 
        src: "./musicas/sua-musica.mp3" 
    },
    // ... mais músicas
]
\`\`\`

## 🎨 Personalização

### Cores do Tema
Edite as variáveis CSS em `styles.css`:

\`\`\`css
:root {
    --primary-gradient: linear-gradient(135deg, #4ECDC4, #C7F464);
    --secondary-gradient: linear-gradient(135deg, #FF6B6B, #FFE66D);
    /* ... outras cores */
}
\`\`\`

### Predefinições do Equalizador
Adicione novas predefinições em `script.js`:

\`\`\`javascript
eqPresets: {
    "Meu Preset": [3, 2, 0, -1, 4], // [60Hz, 250Hz, 1KHz, 4KHz, 16KHz]
    // ... outros presets
}
\`\`\`

## 🔧 Desenvolvimento

### Estrutura do Código
- **Classe Principal**: `DJMixerPro` - Gerencia toda a aplicação
- **Classe AudioTrack**: Gerencia faixas de áudio individuais
- **Modular**: Métodos organizados por funcionalidade
- **Error Handling**: Tratamento robusto de erros
- **Performance**: Otimizado para dispositivos móveis

### Contribuindo
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

- Font Awesome pelos ícones
- Web Audio API pela tecnologia de áudio
- Comunidade open source pelas inspirações

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Entre em contato via email
- Consulte a documentação

---

**DJ Mixer Pro** - Transformando sua paixão por música em arte digital! 🎵✨
