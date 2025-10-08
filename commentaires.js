// commentaires.js - Widget de commentaires réutilisable

window.CommentsWidget = {
    async render(container, articleId, comments, currentUser) {
        container.innerHTML = `
            <style>
                .comments-widget {
                    padding: 20px;
                }
                
                .comment-item {
                    padding: 15px;
                    border-bottom: 1px solid #f0f0f0;
                    position: relative;
                }
                
                .comment-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                }
                
                .comment-avatar {
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .comment-author {
                    font-weight: 600;
                    color: #333;
                }
                
                .comment-date {
                    font-size: 12px;
                    color: #999;
                    margin-left: auto;
                }
                
                .comment-text {
                    color: #333;
                    margin: 8px 0;
                    padding-left: 45px;
                    line-height: 1.5;
                }
                
                .comment-actions {
                    padding-left: 45px;
                    display: flex;
                    gap: 15px;
                }
                
                .comment-btn {
                    background: none;
                    border: none;
                    color: #667eea;
                    font-size: 13px;
                    cursor: pointer;
                    font-weight: 600;
                }
                
                .comment-btn:hover {
                    text-decoration: underline;
                }
                
                .replies-container {
                    margin-left: 45px;
                    border-left: 2px solid #f0f0f0;
                    padding-left: 15px;
                    margin-top: 10px;
                }
                
                .reply-item {
                    padding: 10px 0;
                }
                
                .comment-input-box {
                    margin-top: 15px;
                }
                
                .comment-textarea {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    font-family: inherit;
                    font-size: 14px;
                    min-height: 80px;
                    resize: vertical;
                    transition: border-color 0.3s;
                }
                
                .comment-textarea:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .comment-submit {
                    margin-top: 10px;
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: transform 0.2s;
                }
                
                .comment-submit:hover {
                    transform: translateY(-2px);
                }
                
                .no-comments {
                    text-align: center;
                    padding: 40px 20px;
                    color: #999;
                }
            </style>
            
            <div class="comments-widget">
                ${comments.length === 0 ? `
                    <div class="no-comments">
                        <i class="fas fa-comments" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                        <p>Aucun commentaire pour le moment</p>
                        <p style="font-size: 13px; margin-top: 5px;">Soyez le premier à commenter !</p>
                    </div>
                ` : ''}
                
                <div id="comments-list-${articleId}">
                    ${await this.renderComments(comments, articleId, currentUser)}
                </div>
                
                ${currentUser ? `
                    <div class="comment-input-box">
                        <textarea 
                            id="comment-input-${articleId}" 
                            class="comment-textarea" 
                            placeholder="Écrivez votre commentaire..."></textarea>
                        <button 
                            class="comment-submit" 
                            onclick="CommentsWidget.submitComment('${articleId}')">
                            <i class="fas fa-paper-plane"></i> Publier
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async renderComments(comments, articleId, currentUser) {
        const { supabase } = window.supabaseClient;
        let html = '';

        for (const comment of comments) {
            const author = comment.users_profile;
            const initials = `${author.prenom[0]}${author.nom[0]}`.toUpperCase();
            
            const { data: replies } = await supabase
                .from('session_reponses')
                .select(`
                    *,
                    users_profile(prenom, nom)
                `)
                .eq('session_id', comment.session_id)
                .order('date_created', { ascending: true });

            html += `
                <div class="comment-item">
                    <div class="comment-header">
                        <div class="comment-avatar">${initials}</div>
                        <span class="comment-author">${author.prenom} ${author.nom}</span>
                        <span class="comment-date">${this.formatDate(comment.date_created)}</span>
                    </div>
                    <div class="comment-text">${this.escapeHtml(comment.texte)}</div>
                    <div class="comment-actions">
                        ${currentUser ? `
                            <button class="comment-btn" onclick="CommentsWidget.toggleReplyBox('${comment.session_id}')">
                                <i class="fas fa-reply"></i> Répondre
                            </button>
                        ` : ''}
                        ${replies && replies.length > 0 ? `
                            <button class="comment-btn" onclick="CommentsWidget.toggleReplies('${comment.session_id}')">
                                <i class="fas fa-comment"></i> ${replies.length} réponse(s)
                            </button>
                        ` : ''}
                    </div>
                    
                    <div id="reply-box-${comment.session_id}" style="display: none; margin-top: 10px; padding-left: 45px;">
                        <textarea 
                            id="reply-input-${comment.session_id}" 
                            class="comment-textarea" 
                            placeholder="Écrivez votre réponse..."
                            style="min-height: 60px;"></textarea>
                        <button 
                            class="comment-submit" 
                            onclick="CommentsWidget.submitReply('${comment.session_id}')"
                            style="margin-top: 8px;">
                            <i class="fas fa-paper-plane"></i> Répondre
                        </button>
                    </div>
                    
                    ${replies && replies.length > 0 ? `
                        <div id="replies-${comment.session_id}" class="replies-container" style="display: none;">
                            ${replies.map(reply => {
                                const replyAuthor = reply.users_profile;
                                const replyInitials = `${replyAuthor.prenom[0]}${replyAuthor.nom[0]}`.toUpperCase();
                                return `
                                    <div class="reply-item">
                                        <div class="comment-header">
                                            <div class="comment-avatar" style="width: 30px; height: 30px; font-size: 12px;">${replyInitials}</div>
                                            <span class="comment-author" style="font-size: 14px;">${replyAuthor.prenom} ${replyAuthor.nom}</span>
                                            <span class="comment-date">${this.formatDate(reply.date_created)}</span>
                                        </div>
                                        <div class="comment-text" style="font-size: 14px;">${this.escapeHtml(reply.texte)}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return html;
    },

    async submitComment(articleId) {
        const { supabase, getCurrentUser } = window.supabaseClient;
        const input = document.getElementById(`comment-input-${articleId}`);
        const texte = input.value.trim();

        if (!texte) {
            alert('Veuillez écrire un commentaire');
            return;
        }

        try {
            const user = await getCurrentUser();
            if (!user) {
                 alert('Vous devez être connecté pour commenter.');
                 return;
            }
            
            await supabase
                .from('sessions_commentaires')
                .insert({
                    article_id: articleId,
                    user_id: user.id,
                    texte: texte
                });

            location.reload();

        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la publication du commentaire');
        }
    },

    async submitReply(sessionId) {
        const { supabase, getCurrentUser } = window.supabaseClient;
        const input = document.getElementById(`reply-input-${sessionId}`);
        const texte = input.value.trim();

        if (!texte) {
            alert('Veuillez écrire une réponse');
            return;
        }

        try {
            const user = await getCurrentUser();
            if (!user) {
                 alert('Vous devez être connecté pour répondre.');
                 return;
            }

            await supabase
                .from('session_reponses')
                .insert({
                    session_id: sessionId,
                    user_id: user.id,
                    texte: texte
                });

            location.reload();

        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la publication de la réponse');
        }
    },

    toggleReplyBox(sessionId) {
        const box = document.getElementById(`reply-box-${sessionId}`);
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    },

    toggleReplies(sessionId) {
        const replies = document.getElementById(`replies-${sessionId}`);
        replies.style.display = replies.style.display === 'none' ? 'block' : 'none';
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
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
