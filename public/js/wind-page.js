function createWindElement(wind) {
  const windElement = document.createElement('div');
  windElement.className = 'wind';
  
  const loggedInUsername = getLoggedInUsername();
  const isOwner = wind.username === loggedInUsername;
  const isLiked = wind.isLiked || false;
  const formattedDate = new Date(wind.timestamp).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const likes = Array.isArray(wind.likes) ? wind.likes : [];
  const replies = Array.isArray(wind.replies) ? wind.replies : [];

  const urlParams = new URLSearchParams(window.location.search);
  const parentWindId = urlParams.get('id');
  const isReply = wind.id !== parentWindId;

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
            <span class="username">@${wind.username}</span>
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
    <p>${wind.content}</p>
    <div class="wind-actions">
      <div class="like-action ${isLiked ? 'liked' : ''}">
        <button class="like-btn">
          <img src="/img/${isLiked ? 'hearted' : 'heart'}.svg" alt="Like" class="heart-icon">
        </button>
        <span class="likes-count">${likes.length}</span>
      </div>
      ${!isReply ? `
        <div class="reply-action">
          <button class="reply-btn">
            <img src="/img/reply.svg" alt="Reply" class="reply-icon">
          </button>
          <span class="replies-count">${replies.length}</span>
        </div>
      ` : ''}
      <span>${formattedDate}</span>
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

      const endpoint = isReply ? 
        `/api/winds/${parentWindId}/replies/${wind.id}/like` : 
        `/api/winds/${wind.id}/like`;

      const response = await fetch(endpoint, {
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
          const urlParams = new URLSearchParams(window.location.search);
          const parentWindId = urlParams.get('id');
          
          // Use parentWindId from URL and wind.id as replyId
          const endpoint = `/api/winds/${parentWindId}/replies/${wind.id}`;
          
          const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            windElement.remove();
            // Optionally reload the replies
            loadReplies(parentWindId);
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

  return windElement;
}

function getLoggedInUsername() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(window.atob(base64));
  return payload.username;
}

async function loadWind() {
  const urlParams = new URLSearchParams(window.location.search);
  const windId = urlParams.get('id');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/api/winds/${windId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load wind');
    const wind = await response.json();
    
    const windElement = createWindElement(wind);
    document.querySelector('.original-wind').appendChild(windElement);
    
    loadReplies(windId);
  } catch (error) {
    console.error('Error loading wind:', error);
  }
}

async function loadReplies(windId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`/api/winds/${windId}/replies`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load replies');
    const replies = await response.json();
    
    const repliesContainer = document.getElementById('replies');
    repliesContainer.innerHTML = '';
    replies.forEach(reply => {
      const replyElement = createWindElement(reply);
      repliesContainer.insertBefore(replyElement, repliesContainer.firstChild);
    });
  } catch (error) {
    console.error('Error loading replies:', error);
  }
}

document.getElementById('post-reply').addEventListener('click', async () => {
  const content = document.getElementById('reply-content').value.trim();
  if (!content) return;

  const urlParams = new URLSearchParams(window.location.search);
  const windId = urlParams.get('id');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/api/winds/${windId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) throw new Error('Failed to post reply');
    
    document.getElementById('reply-content').value = '';
    loadReplies(windId);
  } catch (error) {
    console.error('Error posting reply:', error);
  }
});

document.addEventListener('DOMContentLoaded', loadWind);