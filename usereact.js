// usereact.js - Gestion de l'affichage des utilisateurs qui ont réagi aux articles

(function() {
    'use strict';

    const UserReactionsWidget = {
        supabase: null,
        currentUser: null,
        userProfile: null,
        articleId: null,

        async init() {
            // Récupérer Supabase depuis supabaseClient.js
            if (window.supabaseClient) {
                this.supabase = window.supabaseClient.supabase;
                this.currentUser = await window.supabaseClient.getCurrentUser();
                if (this.currentUser) {
                    this.userProfile = await window.supabaseClient.getUserProfile(this.currentUser.id);
                }
            }

            // Récupérer l'article_id depuis l'URL
            const urlParams = new URLSearchParams(window.location.search);
            this.articleId = urlParams.get('article_id');

            if (!this.articleId) {
                console.error('Aucun article_id fourni');
                return;
            }

            await this.loadReactions();
        },

        async loadReactions() {
            const container = document.getElementById('user-reactions-container');
            
            if (!container) {
                console.error('Container user-reactions-container non trouvé');
                return;
            }

            // Afficher un loader
            container.innerHTML = `
                <div class="loader">
                    <div class="spinner"></div>
                    <p style="margin-top: 15px; color: var(--text-tertiary);">Chargement des réactions...</p>
                </div>
            `;

            try {
                // Récupérer les réactions avec les informations utilisateur
                const { data: reactions, error } = await this.supabase
                    .from('article_reactions')
                    .select(`
                        *,
                        users_profile(prenom, nom, user_id)
                    `)
                    .eq('article_id', this.articleId)
                    .order('date_created', { ascending: false });

                if (error) throw error;

                // Récupérer aussi les infos de l'article
                const { data: article, error: articleError } = await this.supabase
                    .from('articles')
                    .select(`
                        *,
                        users_profile(prenom, nom)
                    `)
                    .eq('article_id', this.articleId)
                    .single();

                if (articleError) throw articleError;

                this.renderReactions(container, reactions, article);

            } catch (error) {
                console.error('Erreur lors du chargement des réactions:', error);
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erreur de chargement</h3>
                        <p>Impossible de charger les réactions</p>
                    </div>
                `;
            }
        },

        renderReactions(container, reactions, article) {
            if (!reactions || reactions.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-heart-broken"></i>
                        <h3>Aucune réaction</h3>
                        <p>Cet article n'a pas encore reçu de réactions</p>
                    </div>
                `;
                return;
            }

            // Grouper les réactions par type
            const reactionsByType = {
                like: [],
                love: [],
                rire: [],
                colere: []
            };

            reactions.forEach(reaction => {
                if (reactionsByType[reaction.reaction_type]) {
                    reactionsByType[reaction.reaction_type].push(reaction);
                }
            });

            // Créer le HTML
            let html = `
                <div class="article-info-header">
                    <div class="article-mini-card">
                        <div class="article-mini-author">
                            <div class="avatar-mini">${article.users_profile.prenom[0]}${article.users_profile.nom[0]}</div>
                            <div>
                                <h4>${article.users_profile.prenom} ${article.users_profile.nom}</h4>
                                <p>${new Date(article.date_created).toLocaleDateString('fr-FR', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric'
                                })}</p>
                            </div>
                        </div>
                        <div class="article-mini-text">${this.truncateText(article.texte, 100)}</div>
                    </div>
                </div>

                <div class="reactions-summary">
                    <h3>
                        <i class="fas fa-chart-bar"></i>
                        Résumé des réactions (${reactions.length})
                    </h3>
                    <div class="reactions-stats">
                        ${this.renderReactionStat('like', 'thumbs-up', reactionsByType.like.length)}
                        ${this.renderReactionStat('love', 'heart', reactionsByType.love.length)}
                        ${this.renderReactionStat('rire', 'laugh', reactionsByType.rire.length)}
                        ${this.renderReactionStat('colere', 'angry', reactionsByType.colere.length)}
                    </div>
                </div>

                <div class="reactions-tabs">
                    <button class="tab-btn active" data-type="all">
                        <i class="fas fa-list"></i>
                        Toutes (${reactions.length})
                    </button>
                    <button class="tab-btn" data-type="like">
                        <i class="fas fa-thumbs-up"></i>
                        J'aime (${reactionsByType.like.length})
                    </button>
                    <button class="tab-btn" data-type="love">
                        <i class="fas fa-heart"></i>
                        Amour (${reactionsByType.love.length})
                    </button>
                    <button class="tab-btn" data-type="rire">
                        <i class="fas fa-laugh"></i>
                        Rire (${reactionsByType.rire.length})
                    </button>
                    <button class="tab-btn" data-type="colere">
                        <i class="fas fa-angry"></i>
                        Colère (${reactionsByType.colere.length})
                    </button>
                </div>

                <div class="reactions-list" id="reactions-list">
                    ${this.renderReactionsList(reactions)}
                </div>
            `;

            container.innerHTML = html;

            // Ajouter les événements pour les tabs
            this.initTabs(reactionsByType);
        },

        renderReactionStat(type, icon, count) {
            const colors = {
                like: '#3b82f6',
                love: '#ef4444',
                rire: '#f59e0b',
                colere: '#dc2626'
            };

            const labels = {
                like: 'J\'aime',
                love: 'Amour',
                rire: 'Rire',
                colere: 'Colère'
            };

            return `
                <div class="reaction-stat" style="border-left: 3px solid ${colors[type]};">
                    <i class="fas fa-${icon}" style="color: ${colors[type]};"></i>
                    <div class="stat-info">
                        <span class="stat-label">${labels[type]}</span>
                        <span class="stat-count">${count}</span>
                    </div>
                </div>
            `;
        },

        renderReactionsList(reactions) {
            if (reactions.length === 0) {
                return `
                    <div class="empty-state-small">
                        <p>Aucune réaction dans cette catégorie</p>
                    </div>
                `;
            }

            return reactions.map(reaction => {
                const user = reaction.users_profile;
                const initials = `${user.prenom[0]}${user.nom[0]}`.toUpperCase();
                
                const reactionIcons = {
                    like: { icon: 'thumbs-up', color: '#3b82f6', label: 'J\'aime' },
                    love: { icon: 'heart', color: '#ef4444', label: 'Amour' },
                    rire: { icon: 'laugh', color: '#f59e0b', label: 'Rire' },
                    colere: { icon: 'angry', color: '#dc2626', label: 'Colère' }
                };

                const reactionInfo = reactionIcons[reaction.reaction_type];

                return `
                    <div class="reaction-item">
                        <div class="reaction-user-info">
                            <div class="avatar">${initials}</div>
                            <div class="user-details">
                                <h4>${user.prenom} ${user.nom}</h4>
                                <p>${this.formatDate(reaction.date_created)}</p>
                            </div>
                        </div>
                        <div class="reaction-badge" style="background: ${reactionInfo.color};">
                            <i class="fas fa-${reactionInfo.icon}"></i>
                            <span>${reactionInfo.label}</span>
                        </div>
                    </div>
                `;
            }).join('');
        },

        initTabs(reactionsByType) {
            const tabs = document.querySelectorAll('.tab-btn');
            const listContainer = document.getElementById('reactions-list');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Retirer la classe active de tous les tabs
                    tabs.forEach(t => t.classList.remove('active'));
                    // Ajouter la classe active au tab cliqué
                    tab.classList.add('active');

                    const type = tab.getAttribute('data-type');

                    if (type === 'all') {
                        // Afficher toutes les réactions
                        const allReactions = [
                            ...reactionsByType.like,
                            ...reactionsByType.love,
                            ...reactionsByType.rire,
                            ...reactionsByType.colere
                        ].sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
                        
                        listContainer.innerHTML = this.renderReactionsList(allReactions);
                    } else {
                        // Afficher les réactions du type sélectionné
                        listContainer.innerHTML = this.renderReactionsList(reactionsByType[type]);
                    }
                });
            });
        },

        truncateText(text, maxLength) {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 7) {
                return date.toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                });
            } else if (days > 0) {
                return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
            } else if (hours > 0) {
                return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
            } else if (minutes > 0) {
                return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
            } else {
                return 'À l\'instant';
            }
        }
    };

    // Initialiser le widget au chargement de la page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            UserReactionsWidget.init();
        });
    } else {
        UserReactionsWidget.init();
    }

    // Exposer le widget globalement
    window.UserReactionsWidget = UserReactionsWidget;

})();
