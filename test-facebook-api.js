const axios = require('axios');

// 使用你的 access token
const access_token = 'your_facebook_access_token';
const url = `https://graph.facebook.com/v21.0/me?access_token=EAAIbTfDR474BOyQtlGJ7bpb6ZBWJW52WKOWJsvxMoUaiXSeikN0DVMbplTnNr0saT4b1UhtFEiWgBjQiMdjF2ZC4GngpFH4XsJPbHTCZAdofmgfThRI8RYt5691AkYt8fAZCitBUaDlJEkZBpOowApEJTq7EBZBj6OWoczqXJIHaeYN5I72ZCkHUosCBpsXbQZAuowZDZD`;

axios.get(url)
  .then(response => {
    console.log('Facebook API Response:', response.data);
  })
  .catch(error => {
    console.error('Error accessing Facebook API:', error);
  });
