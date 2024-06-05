export default `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{reportTitle}}</title>

    <!-- TailwindCSS CDN -->
    <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,container-queries"></script>

    <!-- TailwindCSS config -->
    <script>
        tailwind.config = {
        theme: {
            extend: {
                colors: {
                    cradle1: '#02111a',
                    cradle2: '#f68d2e',
                    cradle3: '#253746', 
                },
                typography: (theme) => ({
                    DEFAULT: {
                        css: {
                            pre: {
                                padding: theme('padding.4'),
                                overflow: 'auto !important',
                                maxWidth: '100% !important',
                            },
                            code: {
                                whiteSpace: 'pre-wrap !important',
                                wordBreak: 'break-word !important',
                            },
                        },
                    },
                }),
            }, 
        },
    };
    </script>
    
    <!-- Disable internal links -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const anchors = document.querySelectorAll('a[href]');
            anchors.forEach(function(anchor) {
                const href = anchor.getAttribute('href');
                if (href && (href.startsWith('/') || href.startsWith('#') || !href.includes(':'))) {
                    anchor.addEventListener('click', function(event) {
                        event.preventDefault();
                    });
                }
            });
        });
    </script>
</head>
<body class="bg-gray-100">
    <div class="max-w-4xl print:max-w-none mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg break-all hyphens-auto">
        <div class="border-b-2 pb-4 mb-6 text-center">
            <h1 class="text-2xl font-bold text-gray-800">{{reportTitle}}</h1>
        </div>
        <div class="prose prose-lg !max-w-none">
            {{htmlContent}}
        </div>
    </div>
</body>
</html>`;
