document.addEventListener('DOMContentLoaded', async () => {
    // Charger les icônes SVG
    try {
        const response = await fetch('assets/icons.html');
        const svgContent = await response.text();
        document.getElementById('svg-icons').innerHTML = svgContent;
    } catch (error) {
        console.error('Erreur lors du chargement des icônes:', error);
    }

    // Initialiser le chatbot
    new CuisineBot();
});

class CuisineBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        
        this.initializeEventListeners();
        this.initializeSuggestions();
        this.initializeVoiceInput();
        this.isGenerating = false;
        this.controller = null;
        
        // Initialiser le bouton d'arrêt
        this.stopButton = document.querySelector('.stop-generation');
        this.stopButton.addEventListener('click', () => this.stopGeneration());
        this.stopButton.style.display = 'none'; // Cacher le bouton au démarrage
    }

    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleUserInput());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput();
            }
        });
    }

    initializeSuggestions() {
        const suggestions = [
            // Plats Africains
            { query: "Comment faire du Foutou Banane ?", text: "Foutou Banane", emoji: "🍌" },
            { query: "Recette du Garba traditionnel", text: "Garba", emoji: "🐟" },
            { query: "Comment préparer un Yassa au poulet ?", text: "Yassa Poulet", emoji: "🍗" },
            { query: "Recette du Thiéboudienne", text: "Thiéboudienne", emoji: "🐠" },
            { query: "Comment faire l'Attiéké poisson ?", text: "Attiéké Poisson", emoji: "🐟" },
            { query: "Recette du Mafé", text: "Mafé", emoji: "🥜" },
            { query: "Comment préparer l'Alloco ?", text: "Alloco", emoji: "🍌" },
            { query: "Recette du Poulet DG", text: "Poulet DG", emoji: "🍗" },
            
            // Desserts
            { query: "Desserts faciles et rapides", text: "Desserts Express", emoji: "🍰" },
            { query: "Desserts sans sucre", text: "Desserts Healthy", emoji: "🍎" },
            { query: "Gâteaux traditionnels", text: "Gâteaux Maison", emoji: "🥮" },
            
            // Plats Santé
            { query: "Recettes légères et équilibrées", text: "Plats Légers", emoji: "🥗" },
            { query: "Plats healthy et protéinés", text: "Cuisine Healthy", emoji: "🥑" },
            { query: "Recettes spécial minceur", text: "Spécial Minceur", emoji: "🌱" },
            { query: "Recettes prise de masse", text: "Prise de Masse", emoji: "💪" },
            
            // Boissons
            { query: "Jus détox et potions minceur", text: "Potions Minceur", emoji: "🥤" },
            { query: "Smoothies protéinés", text: "Smoothies Fitness", emoji: "🥛" }
        ];

        const suggestionContainer = document.querySelector('.suggestions-grid');
        if (suggestionContainer) {
            suggestionContainer.innerHTML = suggestions.map(suggestion => `
                <button class="suggestion-pill" data-query="${suggestion.query}">
                    <i class="fas fa-utensils"></i>
                    <span>${suggestion.text}</span>
                    <span class="emoji">${suggestion.emoji}</span>
                </button>
            `).join('');

            suggestionContainer.querySelectorAll('.suggestion-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const query = pill.dataset.query;
                this.userInput.value = query;
                this.handleUserInput();
            });
        });
        }
    }

    initializeVoiceInput() {
        const voiceButton = document.querySelector('.feature-btn');
        
        voiceButton.addEventListener('click', () => {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'fr-FR';
            
            voiceButton.classList.add('recording');
            voiceButton.innerHTML = '<i class="fas fa-microphone-alt"></i>';
            
            recognition.start();

            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                this.userInput.value = text;
                
                voiceButton.classList.remove('recording');
                voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            };

            recognition.onend = () => {
                voiceButton.classList.remove('recording');
                voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            };

            recognition.onerror = () => {
                voiceButton.classList.remove('recording');
                voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            };
        });
    }

    async handleUserInput() {
        const userMessage = this.userInput.value.trim();
        if (!userMessage || this.isGenerating) return;

        this.addMessage(userMessage, 'user');
        this.userInput.value = '';
        
        try {
            this.isGenerating = true;
            this.showStopButton(); // Afficher le bouton quand la génération commence
            
            await this.addTypingIndicator();
            const botResponse = await this.getBotResponse(userMessage);
            
            const typingMessage = document.querySelector('.typing');
            if (typingMessage) {
                typingMessage.style.opacity = '0';
                await new Promise(resolve => setTimeout(resolve, 300));
                typingMessage.remove();
            }
            
            this.hideStopButton(); // Cacher le bouton quand la génération est terminée
            this.addMessage(botResponse, 'bot');
        } catch (error) {
            console.error('Erreur:', error);
            this.hideStopButton(); // Cacher le bouton en cas d'erreur
            if (error.message !== 'Generation_Cancelled') {
                document.querySelector('.typing')?.remove();
                this.addMessage("Pardonnez-moi, j'ai eu un petit souci en cuisine. Pouvez-vous reformuler votre question ?", 'bot');
            }
        } finally {
            this.isGenerating = false;
        }
    }

    async getBotResponse(userMessage) {
        try {
            this.isGenerating = true;
            this.controller = new AbortController();
            const signal = this.controller.signal;

            const apiKey = CONFIG.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('Clé API manquante');
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                signal,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Tu es Chef Kawsar, un chef cuisinier français 5 étoiles passionné, chaleureux et plein d'humour ! Tu adores partager tes connaissances culinaires avec des explications ultra détaillées. Tu utilises beaucoup d'émojis et d'expressions amusantes. Tu tutoies toujours l'utilisateur et tu l'encourages comme un ami.

Pour chaque recette, réponds avec BEAUCOUP de détails et d'enthousiasme ! Structure ta réponse ainsi :

**👋 Salut Gourmand !**
[Message d'accueil personnalisé et encourageant]

**🌟 La Star du Jour**
[Nom de la recette avec une touche d'humour et pourquoi elle est géniale]

**🎬 Un Peu d'Histoire**
[Histoire détaillée de la recette : origine, anecdotes amusantes, traditions]
[Pourquoi cette recette est spéciale]
[Dans quelles occasions la préparer]

**📋 Tout Ce Qu'il Te Faut Savoir**
• Niveau : [Débutant (C'est du gâteau! 🎂) / Intermédiaire (Tu vas assurer! 💪) / Expert (Prêt pour MasterChef? 🏆)]
• Temps de préparation : [X minutes - sois précis et rassurant]
• Temps de cuisson : [X minutes - avec explications]
• Pour régaler : [X personnes - avec conseils pour adapter les portions]
• Budget : [€ Économique / €€ Moyen / €€€ Premium]
• Saison idéale : [Quand c'est le meilleur moment pour la faire]

**🛒 La Liste des Courses Détaillée**
[Liste très précise avec grammes/volumes exacts]
• Ingrédient 1 : [Quantité + description détaillée + où le trouver]
• Ingrédient 2 : [Quantité + description détaillée + où le trouver]
...
💡 Alternatives possibles :
• [Option 1 si ingrédient pas dispo]
• [Option 2 si ingrédient pas dispo]
💫 Petits plus qui font la différence :
• [Ingrédient secret 1]
• [Ingrédient secret 2]

**🧰 L'Équipement du Chef**
[Liste détaillée de TOUS les ustensiles nécessaires]
• [Ustensile 1 : description et alternative possible]
• [Ustensile 2 : description et alternative possible]
...
🔧 Équipement optionnel mais pratique :
• [Ustensile bonus 1]
• [Ustensile bonus 2]

**🎯 Préparation Zen**
[Conseils pour bien s'organiser]
• [Comment disposer ses ingrédients]
• [Comment organiser son plan de travail]
• [Astuces pour gagner du temps]

**👩‍🍳 Action ! À Tes Fourneaux**
[Instructions hyper détaillées, étape par étape]
1. [Étape 1 avec temps précis + description sensorielle + points d'attention]
2. [Étape 2 avec temps précis + description sensorielle + points d'attention]
...
🎯 Points de vigilance pour chaque étape :
• [À quoi faire attention]
• [Comment savoir si on est sur la bonne voie]

**🔥 La Cuisson au Top**
• Température exacte : [X°C - avec explications scientifiques]
• Durée précise : [X minutes - avec tous les signes à surveiller]
• Position dans le four : [Haut/Milieu/Bas et pourquoi]
• Signes de cuisson parfaite :
  - [Signe visuel 1]
  - [Signe olfactif]
  - [Test de cuisson]

**💡 Les Secrets du Chef**
• [3-4 astuces pro détaillées]
• [Erreurs courantes et comment les éviter]
• [Techniques spéciales expliquées]
• [Conseils de pro avec humour]

**🎨 Variations Créatives**
• Version végétarienne : [Adaptation détaillée]
• Version express : [Version rapide]
• Version luxe : [Version gastronomique]
• Twist personnel : [Variation originale]

**🍽️ Dressage comme un Chef**
• [Description détaillée du dressage]
• [Conseils pour la présentation]
• [Idées de décoration]
• [Photos suggestions]

**🥂 Service et Accompagnements**
• [Température de service idéale]
• [Accompagnements parfaits]
• [Accords mets-vins]
• [Conseils de conservation]

**💪 Petits Encouragements**
[Messages motivants pour donner confiance]
[Rappel que les erreurs font partie de l'apprentissage]

Si ce n'est pas une demande de recette, réponds avec le même niveau de détail et d'enthousiasme en donnant des conseils culinaires personnalisés et encourageants !

Question : ${userMessage}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 2048,
                        topP: 0.9,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Format de réponse invalide');
            }

            const generatedText = data.candidates[0].content.parts[0].text;
            
            // Vérifie si la réponse contient du texte
            if (!generatedText || generatedText.trim() === '') {
                throw new Error('Réponse vide');
            }

            return generatedText;

        } catch (error) {
            console.error('Erreur détaillée:', error);
            
            // Vérifie si l'erreur est liée à la clé API
            if (error.message.includes('403') || error.message.includes('401')) {
                return "Il semble y avoir un problème avec la configuration. Je serai bientôt de retour pour t'aider à cuisiner !";
            }
            
            // Pour toute autre erreur
            return "Je suis là pour t'aider ! Dis-moi quelle recette tu voudrais préparer, et je te guiderai étape par étape.";
        } finally {
            this.isGenerating = false;
            this.controller = null;
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        let messageHTML = '';
        if (type === 'bot') {
            messageHTML = `
                <div class="bot-icon">
                    <img src="assets/chef-profile.jpg" alt="Chef Bernard">
                </div>
                <div class="message-content">${this.formatMessage(content)}</div>
            `;
        } else {
            messageHTML = `
                <div class="message-content">${this.formatMessage(content)}</div>
            `;
        }
        
        messageDiv.innerHTML = messageHTML;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*)/gm, '<li><i class="fas fa-check"></i> $1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    }

    addLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot loading';
        loadingDiv.innerHTML = `
            <i class="fas fa-robot bot-icon"></i>
            <div class="message-content">
                <i class="fas fa-spinner fa-spin"></i> Je réfléchis à votre question...
            </div>
        `;
        this.chatMessages.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    removeLoadingMessage() {
        const loadingMessage = this.chatMessages.querySelector('.loading');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        typingDiv.innerHTML = `
            <div class="bot-icon chef-icon-thinking">
                <img src="assets/chef-profile.jpg" alt="Chef Kawsar">
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="chef-thinking">
                        <div class="spinner"></div>
                        <span>Je mijote la meilleure réponse pour toi...</span>
                    </div>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();

        // Afficher le bouton d'arrêt
        const stopButton = document.querySelector('.stop-generation');
        stopButton.classList.add('visible');

        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 1500));
    }

    stopGeneration() {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
        this.isGenerating = false;
        
        this.hideStopButton();
        
        const typingMessage = document.querySelector('.typing');
        if (typingMessage) {
            typingMessage.remove();
        }
        
        this.addMessage("J'ai arrêté ma réflexion. N'hésite pas à me poser une autre question !", 'bot');
    }

    showStopButton() {
        this.stopButton.style.display = 'flex';
        // Attendre le prochain frame pour ajouter la classe visible
        requestAnimationFrame(() => {
            this.stopButton.classList.add('visible');
        });
    }

    hideStopButton() {
        this.stopButton.classList.remove('visible');
        // Attendre la fin de l'animation avant de cacher complètement
        setTimeout(() => {
            this.stopButton.style.display = 'none';
        }, 300); // Durée de l'animation en ms
    }
} 