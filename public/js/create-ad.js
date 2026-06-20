const form =
    document.getElementById('adForm');

form.addEventListener(
    'submit',
    async (e) => {

        e.preventDefault();

        const title =
            document.getElementById('title').value;

        const description =
            document.getElementById('description').value;

        const startDate =
            document.getElementById('startDate').value;

        const endDate =
            document.getElementById('endDate').value;

        const response =
            await fetch('/api/ads', {

                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    title,
                    description,
                    startDate,
                    endDate

                })

            });

        const data =
            await response.json();

        document.getElementById('message')
            .textContent =
                data.message || data.error;

    }
);