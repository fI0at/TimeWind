async function loadUsers() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      window.location.href = '/';
      return;
    }

    const users = await response.json();
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';

    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>@${user.username}</td>
        <td>${user.displayName}</td>
        <td>
          ${user.badge ? `<img src="/img/${user.badge}.svg" alt="${user.badge}" class="badge-icon" />` : ''}
        </td>
        <td>
          ${user.username === 'admin' ? `
            <select class="badge-select" disabled>
              <option value="administrator" selected>Administrator</option>
            </select>
            <button class="save-badge" disabled>Save</button>
          ` : `
            <select class="badge-select">
              <option value="" ${!user.badge ? 'selected' : ''}>None</option>
              <option value="verified" ${user.badge === 'verified' ? 'selected' : ''}>Verified</option>
              <option value="administrator" ${user.badge === 'administrator' ? 'selected' : ''}>Administrator</option>
            </select>
            <button class="save-badge" data-username="${user.username}">Save</button>
          `}
        </td>
      `;
      tableBody.appendChild(tr);
    });

    document.querySelectorAll('.save-badge:not([disabled])').forEach(button => {
      button.addEventListener('click', async () => {
        const username = button.dataset.username;
        const select = button.previousElementSibling;
        const selectedBadge = select.value;

        try {
          const response = await fetch(`/api/admin/users/${username}/badge`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ badge: selectedBadge })
          });

          if (response.ok) {
            loadUsers();
          }
        } catch (error) {
          console.error('Error updating badge:', error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadUsers); 