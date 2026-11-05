export function emptyState({ title, description, actionLabel, onAction }) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = description;
  text.style.fontSize = '13px';
  wrap.append(heading, text);
  if (actionLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-button';
    button.style.marginTop = '12px';
    button.style.maxWidth = '240px';
    button.style.marginLeft = 'auto';
    button.style.marginRight = 'auto';
    button.textContent = actionLabel;
    button.addEventListener('click', onAction);
    wrap.append(button);
  }
  return wrap;
}
