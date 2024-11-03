const windForm = document.getElementById('wind-form');
const windContent = document.getElementById('wind-content');
const feedContainer = document.getElementById('feed');

function getLoggedInUsername() {
	const token = localStorage.getItem('token');
	if (!token) return null;
	
	const base64Url = token.split('.')[1];
	const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	const payload = JSON.parse(window.atob(base64));
	return payload.username;
}

function createWindElement(wind) {
	const windElement = document.createElement('div');
	windElement.className = 'wind';
	
	const loggedInUsername = getLoggedInUsername();
	const formattedContent = formatUserMentions(wind.content, loggedInUsername, wind.username, wind.badge);
	const isOwner = wind.username === loggedInUsername;
	const isLiked = wind.isLiked;
	const timestamp = new Date(wind.timestamp);
	const formattedDate = timestamp.toLocaleDateString('en-US', {
		month: 'numeric',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
			hour12: true
	});
	
	windElement.innerHTML = `
		<div class="wind-header">
			<div class="wind-user-info">
				<img src="/api/users/profile-picture/${wind.username}" alt="Profile picture" class="wind-profile-pic">
				<div class="wind-user-text">
					<a href="/profile?username=${wind.username}">
						<div class="name-badge-container">
							<span class="display-name">${wind.displayName}</span>
              				<div class="user-badges">
								${wind.badge ? `<img src="/img/${wind.badge}.svg" alt="${wind.badge}" class="badge-icon" title="${wind.badge}" />` : ''}
							</div>
						</div>
						${wind.username === 'admin' ? '' : `<span class="username">@${wind.username}</span>`}
					</a>
				</div>
			</div>
			${isOwner ? `
				<div class="wind-options">
					<button class="options-btn">
						<img src="/img/dots.svg" alt="Wind options" class="dots-icon">
					</button>
					<div class="options-menu">
						<button class="delete-wind">Delete</button>
					</div>
				</div>
			` : ''}
		</div>
		<p>${formattedContent}</p>
		<div class="wind-actions">
			<div class="like-action ${isLiked ? 'liked' : ''}">
				<button class="like-btn">
					<img src="/img/${isLiked ? 'hearted' : 'heart'}.svg" alt="Like" class="heart-icon">
				</button>
				<span class="likes-count">${wind.likes.length}</span>
			</div>
			<div class="reply-action">
				<button class="reply-btn">
					<img src="/img/reply.svg" alt="Reply" class="reply-icon">
				</button>
				<span class="replies-count">${wind.replies.length}</span>
			</div>
			<div class="timestamp-action">
				<span>${formattedDate}</span>
			</div>
		</div>
	`;
	
	const likeBtn = windElement.querySelector('.like-btn');
	const heartIcon = likeBtn.querySelector('.heart-icon');
	const likesCount = windElement.querySelector('.likes-count');
	const likeAction = windElement.querySelector('.like-action');

	likeBtn.addEventListener('click', async () => {
		try {
			const isCurrentlyLiked = likeAction.classList.contains('liked');
			
			if (!isCurrentlyLiked) {
				likeBtn.classList.add('animate');
				setTimeout(() => {
					likeBtn.classList.remove('animate');
				}, 400);
			}

			const response = await fetch(`/api/winds/${wind.id}/like`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('token')}`
				}
			});

			if (response.ok) {
				if (isCurrentlyLiked) {
					likeAction.classList.remove('liked');
					heartIcon.src = '/img/heart.svg';
						likesCount.textContent = parseInt(likesCount.textContent) - 1;
				} else {
					likeAction.classList.add('liked');
						heartIcon.src = '/img/hearted.svg';
						likesCount.textContent = parseInt(likesCount.textContent) + 1;
				}
			}
		} catch (error) {
			console.error('Error liking wind:', error);
		}
	});
	
	if (isOwner) {
		const optionsBtn = windElement.querySelector('.options-btn');
		const optionsMenu = windElement.querySelector('.options-menu');
		const deleteBtn = windElement.querySelector('.delete-wind');
		
		optionsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			optionsMenu.classList.toggle('active');
		});
		
		deleteBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			optionsMenu.classList.remove('active');
			
			const confirmDialog = document.createElement('div');
			confirmDialog.className = 'confirm-dialog';
			confirmDialog.innerHTML = `
				<div class="confirm-content">
					<p>Are you sure you want to delete this wind?</p>
					<div class="confirm-buttons">
						<button class="confirm-yes">Delete</button>
						<button class="confirm-no">Cancel</button>
					</div>
				</div>
			`;
			
			document.body.appendChild(confirmDialog);
			setTimeout(() => confirmDialog.classList.add('active'), 10);
			
			const handleClickOutside = (event) => {
				if (event.target === confirmDialog) {
					confirmDialog.classList.remove('active');
					setTimeout(() => confirmDialog.remove(), 300);
					document.removeEventListener('click', handleClickOutside);
				}
			};
			
			document.addEventListener('click', handleClickOutside);
			
			confirmDialog.querySelector('.confirm-yes').addEventListener('click', async () => {
				try {
					const response = await fetch(`/api/winds/${wind.id}`, {
						method: 'DELETE',
						headers: {
							'Authorization': `Bearer ${localStorage.getItem('token')}`
						}
					});
					
					if (response.ok) {
						windElement.remove();
					}
				} catch (error) {
					console.error('Error deleting wind:', error);
				}
				confirmDialog.classList.remove('active');
				setTimeout(() => confirmDialog.remove(), 300);
			});
			
			confirmDialog.querySelector('.confirm-no').addEventListener('click', () => {
				confirmDialog.classList.remove('active');
				setTimeout(() => confirmDialog.remove(), 300);
			});
		});
		
		document.addEventListener('click', (e) => {
			if (!optionsMenu.contains(e.target) && !optionsBtn.contains(e.target)) {
				optionsMenu.classList.remove('active');
			}
		});
	}
	
	const replyBtn = windElement.querySelector('.reply-btn');
	replyBtn.addEventListener('click', () => {
		window.location.href = `/wind?id=${wind.id}`;
	});
	
	return windElement;
}

async function loadFeed() {
	const token = localStorage.getItem('token');
	if (!token) return;

	try {
		const response = await fetch('/api/winds/feed', {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (!response.ok) throw new Error('Failed to load feed');
		const winds = await response.json();
		
		feedContainer.innerHTML = '';
		winds.forEach(wind => {
			const windElement = createWindElement(wind);
			feedContainer.appendChild(windElement);
		});
	} catch (error) {
		console.error('Error loading feed:', error);
	}
}

async function postWind(content) {
	const token = localStorage.getItem('token');
	if (!token) {
		window.location.href = '/login';
		return;
	}

	try {
		let location = null;
		
		if ("geolocation" in navigator) {
			try {
				const position = await new Promise((resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject);
				});
				
				location = {
					lat: position.coords.latitude,
					lon: position.coords.longitude
				};
			} catch (error) {
				console.log('Location access denied or error:', error);
			}
		}

		const response = await fetch('/api/winds', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ 
				content,
				location 
			})
		});

		if (!response.ok) throw new Error('Failed to post wind');
		
		const wind = await response.json();
		await loadFeed();
		windContent.value = '';
	} catch (error) {
		console.error('Error posting wind:', error);
	}
}

document.getElementById('post-wind').addEventListener('click', () => {
	const content = windContent.value.trim();
	if (content) {
		postWind(content);
	}
});

document.addEventListener('DOMContentLoaded', loadFeed);

function sanitizeContent(content, username, badge) {
	if (badge?.toLowerCase() === 'administrator') return content;
	
	const sanitized = content.replace(/<[^>]*>/g, '');
	if (content !== sanitized) {
		console.log(`Sanitized HTML from user ${username}:`);
		console.log('Original:', content);
		console.log('Sanitized:', sanitized);
	}
	return sanitized;
}

function formatUserMentions(content, currentUsername, authorUsername, authorBadge) {
	content = sanitizeContent(content, authorUsername, authorBadge);
	return content.replace(/@(\w+)/g, (match, username) => {
		const isSelf = username === currentUsername;
		return `<a href="/profile?username=${username}" class="mention${isSelf ? ' mention-self' : ''}">${match}</a>`;
	});
}