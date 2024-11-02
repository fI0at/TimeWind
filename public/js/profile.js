async function loadProfile() {
  const token = localStorage.getItem('token');

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    const endpoint = urlUsername ? `/api/users/profile/${urlUsername}` : '/api/users/profile/me';
    const editButton = document.getElementById('edit-profile');
    const followButton = document.getElementById('follow-button');

    const currentUserResponse = await fetch('/api/users/profile/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const currentUser = await currentUserResponse.json();

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      document.getElementById('display-name').textContent = 'Nonexistant User';
      document.getElementById('username').textContent = '@null';
      document.getElementById('profile-picture').src = '/img/default-profile.png';
      document.getElementById('followers').textContent = '0';
      document.getElementById('following').textContent = '0';
      editButton.textContent = 'Home';
      editButton.addEventListener('click', () => window.location.href = '/');
      followButton.style.display = 'none';
      throw new Error('Failed to load profile');
    }

    const profile = await response.json();
    
    document.getElementById('display-name').textContent = profile.displayName;
    const badgesContainer = document.getElementById('profile-user-badges');
    if (badgesContainer) {
        badgesContainer.innerHTML = profile.badge ? 
            `<img src="/img/${profile.badge}.svg" alt="${profile.badge}" class="profile-badge-icon" title="${profile.badge}" style="margin-left: 2px; vertical-align: middle;" />` 
            : '';
    }
    document.getElementById('username').textContent = `@${profile.username}`;
    document.getElementById('user-bio').textContent = profile.bio || '';
    document.getElementById('followers').textContent = profile.followers;
    document.getElementById('following').textContent = profile.following;
    document.getElementById('profile-picture').src = `/api/users/profile-picture/${profile.username}`;
  
    if (currentUser.username === profile.username) {
      editButton.style.display = 'block';
      followButton.style.display = 'none';
      setupProfileEditing();
    } else {
      editButton.style.display = 'none';
      followButton.style.display = 'block';
      followButton.textContent = profile.isFollowing ? 'Unfollow' : 'Follow';
      setupFollowButton(profile.username);
    }
    await loadUserWinds(profile.username);
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function setupFollowButton(targetUsername) {
  const followButton = document.getElementById('follow-button');
  const followersCount = document.getElementById('followers');

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
        const currentCount = parseInt(followersCount.textContent);
        followersCount.textContent = isFollowing ? currentCount - 1 : currentCount + 1;
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  });
}

async function setupProfileEditing() {
  const modal = document.getElementById('edit-profile-modal');
  const editButton = document.getElementById('edit-profile');
  const cancelButton = modal.querySelector('.cancel-button');
  const form = document.getElementById('edit-profile-form');

  const displayNameInput = document.getElementById('new-display-name');
  const usernameInput = document.getElementById('new-username');
  const bioInput = document.getElementById('new-bio');

  editButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/users/profile/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load profile data');
      
      const profile = await response.json();
      
      displayNameInput.value = profile.displayName || '';
      usernameInput.value = profile.username || '';
      bioInput.value = profile.bio || '';
      
      modal.classList.add('active');
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  });

  cancelButton.addEventListener('click', () => {
    modal.classList.remove('active');
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });

  let cropper = null;

  document.getElementById('profile-picture-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const previewContainer = document.getElementById('image-preview-container');
        previewContainer.innerHTML = '';
        
        const image = document.createElement('img');
        image.src = event.target.result;
        previewContainer.appendChild(image);

        if (cropper) {
          cropper.destroy();
        }

        cropper = new Cropper(image, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 1,
          responsive: true,
          restore: false
        });
      };
      reader.readAsDataURL(file);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    const newDisplayName = displayNameInput.value;
    const newUsername = usernameInput.value;
    const newBio = bioInput.value;
    
    if (newDisplayName) formData.append('newDisplayName', newDisplayName);
    if (newUsername) formData.append('newUsername', newUsername);
    if (newBio) formData.append('newBio', newBio);

    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        width: 512,
        height: 512,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      await new Promise(resolve => {
        canvas.toBlob(blob => {
          formData.append('profilePicture', blob, 'profile.jpg');
          resolve();
        }, 'image/jpeg', 0.9);
      });
    }

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      if (newUsername && data.token) {
        localStorage.setItem('token', data.token);
        window.location.href = '/profile';
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  });

  document.querySelector('.cancel-button').addEventListener('click', () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    document.getElementById('image-preview-container').innerHTML = '';
  });
}

async function loadUserWinds(username) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`/api/winds/user/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load winds');

    const winds = await response.json();
    const windsContainer = document.getElementById('user-winds');
    windsContainer.innerHTML = '';
    
    winds.forEach(wind => {
      const windElement = createWindElement(wind);
      windsContainer.appendChild(windElement);
    });
  } catch (error) {
    console.error('Error loading winds:', error);
  }
}

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
        <span class="likes-count">${wind.likes.length}</span>
      </div>
      <div class="reply-action">
        <button class="reply-btn">
          <img src="/img/reply.svg" alt="Reply" class="reply-icon">
        </button>
        <span class="replies-count">${wind.replies.length}</span>
      </div>
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

  const replyBtn = windElement.querySelector('.reply-btn');
  replyBtn.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const parentWindId = urlParams.get('id') || wind.id;
    window.location.href = `/wind?id=${parentWindId}`;
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
  
  return windElement;
}

document.addEventListener('DOMContentLoaded', loadProfile);