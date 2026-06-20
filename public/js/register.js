const form = document.getElementById('registerForm');

    form.addEventListener('submit', async (e) => {

    e.preventDefault();

    const login =
        document.getElementById('login').value;

    const email =
        document.getElementById('email').value;

    const password =
        document.getElementById('password').value;

    const response =
        await fetch('/api/register', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                login,
                email,
                password
            })

        });

    const data =
        await response.json();

    document.getElementById('message')
        .textContent = data.message;

});