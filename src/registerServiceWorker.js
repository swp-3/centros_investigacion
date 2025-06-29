if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registrado con éxito:', registration)
    }).catch(error => {
      console.log('Error al registrar el ServiceWorker:', error)
    })
  })
}