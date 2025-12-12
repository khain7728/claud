// Toggle notification panel
(function() {
  const notifContainer = document.getElementById('notifications');
  const notifTrigger = document.getElementById('notif-trigger');
  const notifPanel = document.getElementById('notif-panel');

  if (!notifContainer || !notifTrigger || !notifPanel) return;

  // Toggle panel on click
  notifTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    notifContainer.classList.toggle('open');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!notifContainer.contains(e.target)) {
      notifContainer.classList.remove('open');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && notifContainer.classList.contains('open')) {
      notifContainer.classList.remove('open');
      notifTrigger.focus();
    }
  });
})();
