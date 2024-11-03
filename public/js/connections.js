function getLoggedInUsername() {
	const token = localStorage.getItem('token');
	if (!token) return null;
	
	const base64Url = token.split('.')[1];
	const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	const payload = JSON.parse(window.atob(base64));
	return payload.username;
}

async function loadConnections() {
	const token = localStorage.getItem('token');
	const urlParams = new URLSearchParams(window.location.search);
	const username = urlParams.get('username');
	const type = urlParams.get('type');

	try {
		const response = await fetch(`/api/users/${username}/${type}`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (!response.ok) throw new Error('Failed to load connections');
		
		const data = await response.json();
		const headerText = `${data.displayName}'s ${type}`;
		document.getElementById('connections-header').textContent = headerText;
		
		const connectionsList = document.getElementById('connections-list');
		connectionsList.innerHTML = '';

		if (data.connections.length === 0 && data.emptyMessage) {
			const emptyMessage = document.createElement('div');
			emptyMessage.className = 'empty-connections-message';
			emptyMessage.textContent = data.emptyMessage;
			connectionsList.appendChild(emptyMessage);
			return;
		}

		data.connections.forEach(user => {
			const connectionElement = createConnectionElement(user);
			connectionsList.appendChild(connectionElement);
		});
	} catch (error) {
		console.error('Error loading connections:', error);
	}
}

function createConnectionElement(user) {
	const element = document.createElement('div');
	element.className = 'connection-item';
	
	const loggedInUsername = getLoggedInUsername();
	const isFollowing = user.isFollowedByMe;
	const isCurrentUser = user.username === loggedInUsername;
	
	const followersLink = `<a href="/connections?username=${user.username}&type=followers">${user.followers} followers</a>`;

	const followingLink = `<a href="/connections?username=${user.username}&type=following">${user.following} following</a>`;

	element.innerHTML = `
		<div class="connection-info">
			<img src="/api/users/profile-picture/${user.username}" alt="Profile picture" class="connection-profile-pic" onclick="window.location.href='/profile/@${user.username}'">
			<div class="connection-details">
				<div class="name-badge-container" onclick="window.location.href='/profile?username=${user.username}'">
					<span class="display-name">${user.displayName}</span>
					${user.badge ? `<img src="/img/${user.badge}.svg" alt="${user.badge}" class="badge-icon" title="${user.badge}" />` : ''}
				</div>
				<span class="username">@${user.username}</span>
				<div class="connection-stats">
					${followersLink} ·
					${followingLink}
				</div>
			</div>
			<div class="follow-button-container">
				${!isCurrentUser ? `<button class="${isFollowing ? 'unfollow-button' : 'follow-button'}">${isFollowing ? 'Unfollow' : (user.followsMe ? 'Follow Back' : 'Follow')}</button>` : ''}
			</div>
		</div>
	`;

	if (!isCurrentUser) {
		const followButton = element.querySelector('.follow-button, .unfollow-button');
		followButton.addEventListener('click', async () => {
			const isUnfollow = followButton.classList.contains('unfollow-button');
			try {
				const response = await fetch(`/api/users/${isUnfollow ? 'unfollow' : 'follow'}/${user.username}`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${localStorage.getItem('token')}`
					}
				});

				if (response.ok) {
					if (isUnfollow) {
						followButton.textContent = user.followsMe ? 'Follow Back' : 'Follow';
						followButton.className = 'follow-button';
					} else {
						followButton.textContent = 'Unfollow';
						followButton.className = 'unfollow-button';
					}
				}
			} catch (error) {
				console.error('Error updating follow status:', error);
			}
		});
	}

	return element;
}

async function setupFollowButton(targetUsername) {
	const followButton = document.getElementById('follow-button');
	const followersElement = document.getElementById('followers');
	const followersCount = parseInt(followersElement.textContent.split(' ')[0]);

	followButton.addEventListener('click', async () => {
		const token = localStorage.getItem('token');
		const isFollowing = followButton.textContent === 'Unfollow';

		try {
			const response = await fetch(`/api/users/${isFollowing ? 'unfollow' : 'follow'}/${targetUsername}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (response.ok) {
				followButton.textContent = isFollowing ? 'Follow' : 'Unfollow';
				const newCount = isFollowing ? followersCount - 1 : followersCount + 1;
				followersElement.innerHTML = `<a href="/connections?username=${targetUsername}&type=followers">${newCount} followers</a>`;
			}
		} catch (error) {
			console.error('Error updating follow status:', error);
		}
	});
}

document.addEventListener('DOMContentLoaded', loadConnections);