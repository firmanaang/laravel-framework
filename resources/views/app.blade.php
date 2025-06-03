<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title id="app-title">{{ $company['name'] ?? 'Laravel Vue Dashboard' }} - Dashboard</title>

    <!-- Enhanced PWA Meta Tags -->
    <meta name="theme-color" content="#3B82F6">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Dashboard Pro">
    <meta name="description" content="{{ $company['description'] ?? 'Modern Laravel Vue Dashboard with Offline Support' }}">

    <!-- Enhanced Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

    <!-- Enhanced Theme Initialization -->
    <script>
// Enhanced theme and title initialization
(function() {
    try {
        // Set company data from Laravel - pastikan description ada
        window.companyData = @json([
            'name' => $company['name'] ?? 'Laravel Vue Dashboard',
            'description' => $company['description'] ?? 'Modern Dashboard Platform',
            'logo' => $company['logo'] ?? 'lightning'
        ]);

        console.log('Company Data Loaded:', window.companyData);

        // Load app settings for title, fallback to company data
        const appSettings = localStorage.getItem('appSettings');
        if (appSettings) {
            const settings = JSON.parse(appSettings);
            document.getElementById('app-title').textContent = settings.appName + ' - Dashboard';
        } else {
            // Use company data as fallback
            document.getElementById('app-title').textContent = window.companyData.name + ' - Dashboard';
        }

        // Existing theme code...
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const shouldBeDark = savedTheme === 'dark' ||
                           (savedTheme === 'auto' && prefersDark) ||
                           (!savedTheme && prefersDark);

        if (shouldBeDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.style.colorScheme = 'light';
        }
    } catch (error) {
        console.warn('Failed to initialize theme:', error);
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.style.colorScheme = 'light';
    }
})();
</script>

    <!-- Conditional Asset Loading -->
    @if(app()->environment('local') && file_exists(public_path('hot')))
        {{-- Development with Vite HMR --}}
        @vite(['resources/css/app.css', 'resources/js/app.ts'])
    @elseif(file_exists(public_path('build/manifest.json')))
        {{-- Production with built assets --}}
        @php
            $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true);
            $cssFile = $manifest['resources/css/app.css']['file'] ?? null;
            $jsFile = $manifest['resources/js/app.ts']['file'] ?? null;
        @endphp

        @if($cssFile)
            <link rel="stylesheet" href="{{ asset('build/' . $cssFile) }}">
        @endif

        @if($jsFile)
            <script type="module" src="{{ asset('build/' . $jsFile) }}" defer></script>
        @endif
    @else
        {{-- Fallback: try Vite --}}
        @vite(['resources/css/app.css', 'resources/js/app.ts'])
    @endif
</head>
<body class="antialiased h-full bg-background text-foreground transition-colors duration-300">
    <!-- Enhanced Initial Loading Screen -->
    <div id="initial-loading" class="initial-loading">
    <!-- Animated background -->
    <div class="initial-loading-background"></div>

    <!-- Main loading container -->
    <div class="initial-loading-container">
        <!-- Enhanced spinner with multiple rings -->
        <div class="initial-loading-spinner">
            <div class="initial-loading-ring initial-loading-ring-1"></div>
            <div class="initial-loading-ring initial-loading-ring-2"></div>
            <div class="initial-loading-ring initial-loading-ring-3"></div>
            <div class="initial-loading-center-dot"></div>
        </div>

        <!-- Enhanced text content -->
        <div class="initial-loading-content">
            <h1 class="initial-loading-title">{{ $company['name'] ?? 'Laravel Vue Dashboard' }}</h1>
            <p class="initial-loading-subtitle">{{ $company['description'] ?? 'Modern Dashboard Platform' }}</p>

            <!-- Progress dots -->
            <div class="initial-loading-dots">
                <div class="initial-loading-dot"></div>
                <div class="initial-loading-dot"></div>
                <div class="initial-loading-dot"></div>
            </div>
        </div>

        <!-- Environment info -->
        <div class="initial-loading-info">
            <div class="initial-loading-badge">
                <svg class="initial-loading-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Environment: {{ app()->environment() }}
                @if(file_exists(public_path('build/manifest.json')))
                    - Built Assets ✅
                @elseif(file_exists(public_path('hot')))
                    - Dev Server 🔥
                @else
                    - No Assets ❌
                @endif
            </div>
        </div>
    </div>

    <!-- Floating particles -->
    <div class="initial-loading-particles">
        <div class="initial-loading-particle" style="--delay: 0s; --duration: 3s; --size: 6px; left: 10%; top: 20%;"></div>
        <div class="initial-loading-particle" style="--delay: 0.5s; --duration: 4s; --size: 8px; left: 80%; top: 30%;"></div>
        <div class="initial-loading-particle" style="--delay: 1s; --duration: 3.5s; --size: 5px; left: 60%; top: 70%;"></div>
        <div class="initial-loading-particle" style="--delay: 1.5s; --duration: 4.5s; --size: 7px; left: 30%; top: 80%;"></div>
        <div class="initial-loading-particle" style="--delay: 2s; --duration: 3.2s; --size: 6px; left: 90%; top: 60%;"></div>
        <div class="initial-loading-particle" style="--delay: 2.5s; --duration: 4.2s; --size: 9px; left: 20%; top: 50%;"></div>
    </div>
</div>

<style>
/* Enhanced Initial Loading Styles */
.initial-loading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.initial-loading-background {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg,
        #f8fafc 0%,
        #e2e8f0 25%,
        #f1f5f9 50%,
        #e2e8f0 75%,
        #f8fafc 100%
    );
    background-size: 400% 400%;
    animation: initialGradientShift 8s ease-in-out infinite;
}

.dark .initial-loading-background {
    background: linear-gradient(135deg,
        #020617 0%,
        #0f172a 25%,
        #1e293b 50%,
        #0f172a 75%,
        #020617 100%
    );
}

.initial-loading-container {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 3rem 2rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 24px;
    border: 1px solid rgba(226, 232, 240, 0.5);
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    animation: initialContainerFloat 6s ease-in-out infinite;
    max-width: 400px;
    width: 90%;
}

.dark .initial-loading-container {
    background: rgba(15, 23, 42, 0.95);
    border-color: rgba(51, 65, 85, 0.5);
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.4),
        0 10px 10px -5px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(255, 255, 255, 0.05);
}

.initial-loading-spinner {
    position: relative;
    width: 80px;
    height: 80px;
    margin-bottom: 2rem;
}

.initial-loading-ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid transparent;
    animation: initialSpin 2s linear infinite;
}

.initial-loading-ring-1 {
    width: 80px;
    height: 80px;
    border-top: 2px solid #3b82f6;
    border-right: 2px solid #3b82f6;
    animation-duration: 2s;
}

.initial-loading-ring-2 {
    width: 60px;
    height: 60px;
    top: 10px;
    left: 10px;
    border-top: 2px solid #8b5cf6;
    border-left: 2px solid #8b5cf6;
    animation-duration: 1.5s;
    animation-direction: reverse;
}

.initial-loading-ring-3 {
    width: 40px;
    height: 40px;
    top: 20px;
    left: 20px;
    border-top: 2px solid #06b6d4;
    border-bottom: 2px solid #06b6d4;
    animation-duration: 1s;
}

.initial-loading-center-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 12px;
    background: linear-gradient(45deg, #3b82f6, #8b5cf6);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: initialPulse 2s ease-in-out infinite;
}

.initial-loading-content {
    margin-bottom: 2rem;
}

.initial-loading-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: initialTitleGlow 3s ease-in-out infinite;
    line-height: 1.2;
}

.dark .initial-loading-title {
    color: #f8fafc;
}

.initial-loading-subtitle {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
    margin-bottom: 1.5rem;
    line-height: 1.4;
    animation: initialTextFade 2s ease-in-out infinite;
}

.dark .initial-loading-subtitle {
    color: #94a3b8;
}

.initial-loading-dots {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
}

.initial-loading-dot {
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    animation: initialDotBounce 1.4s ease-in-out infinite both;
}

.initial-loading-dot:nth-child(1) { animation-delay: -0.32s; }
.initial-loading-dot:nth-child(2) { animation-delay: -0.16s; }
.initial-loading-dot:nth-child(3) { animation-delay: 0s; }

.initial-loading-info {
    margin-top: 1rem;
}

.initial-loading-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid rgba(59, 130, 246, 0.2);
    gap: 0.25rem;
}

.dark .initial-loading-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.3);
}

.initial-loading-icon {
    width: 12px;
    height: 12px;
}

.initial-loading-particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
}

.initial-loading-particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    background: linear-gradient(45deg, #3b82f6, #8b5cf6);
    border-radius: 50%;
    opacity: 0.6;
    animation: initialParticleFloat var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
}

.loading-fade-out {
    animation: initialFadeOut 0.5s ease-out forwards;
}

/* Animations */
@keyframes initialGradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

@keyframes initialContainerFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
}

@keyframes initialSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes initialPulse {
    0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.8;
    }
}

@keyframes initialTitleGlow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
}

@keyframes initialTextFade {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

@keyframes initialDotBounce {
    0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes initialParticleFloat {
    0% {
        transform: translateY(100vh) rotate(0deg);
        opacity: 0;
    }
    10% {
        opacity: 0.6;
    }
    90% {
        opacity: 0.6;
    }
    100% {
        transform: translateY(-100px) rotate(360deg);
        opacity: 0;
    }
}

@keyframes initialFadeOut {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0;
        transform: scale(0.95);
    }
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .initial-loading-container {
        padding: 2rem 1.5rem;
        margin: 1rem;
    }

    .initial-loading-spinner {
        width: 60px;
        height: 60px;
    }

    .initial-loading-ring-1 {
        width: 60px;
        height: 60px;
    }

    .initial-loading-ring-2 {
        width: 45px;
        height: 45px;
        top: 7.5px;
        left: 7.5px;
    }

    .initial-loading-ring-3 {
        width: 30px;
        height: 30px;
        top: 15px;
        left: 15px;
    }

    .initial-loading-title {
        font-size: 1.5rem;
    }

    .initial-loading-subtitle {
        font-size: 0.8rem;
    }

    .initial-loading-badge {
        font-size: 0.7rem;
        padding: 0.4rem 0.8rem;
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    .initial-loading-ring,
    .initial-loading-center-dot,
    .initial-loading-particle {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
    }

    .initial-loading-container {
        animation: none;
    }

    .initial-loading-background {
        animation: none;
        background: #f8fafc;
    }

    .dark .initial-loading-background {
        background: #020617;
    }
}
</style>

    <!-- Vue App Mount Point -->
    <div id="app" v-cloak></div>

    <!-- Enhanced Global Scripts -->
    <script>
        window.csrfToken = '{{ csrf_token() }}';

        // Enhanced loading screen management
        document.addEventListener('DOMContentLoaded', function() {
            const checkVueMount = () => {
                const app = document.getElementById('app');
                if (app && app.children.length > 0) {
                    const loadingElement = document.getElementById('initial-loading');
                    if (loadingElement) {
                        loadingElement.classList.add('loading-fade-out');
                        setTimeout(() => {
                            loadingElement.remove();
                        }, 500);
                    }
                } else {
                    setTimeout(checkVueMount, 100);
                }
            };

            setTimeout(checkVueMount, 800);
        });

        // Enhanced debugging helpers
        window.clearAll = async function() {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('✅ All Service Workers unregistered');
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ All caches cleared');
            }

            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Storage cleared');

            alert('✅ All cleared. Page will reload.');
            window.location.reload();
        };

        window.checkAssets = function() {
            console.log('🔍 Asset Status:');
            console.log('Environment:', '{{ app()->environment() }}');
            console.log('Has manifest:', {{ file_exists(public_path('build/manifest.json')) ? 'true' : 'false' }});
            console.log('Has hot file:', {{ file_exists(public_path('hot')) ? 'true' : 'false' }});
            console.log('Current URL:', window.location.href);

            // Check loaded assets
            const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
            const jsScripts = document.querySelectorAll('script[src]');

            console.log('CSS Files:', Array.from(cssLinks).map(link => link.href));
            console.log('JS Files:', Array.from(jsScripts).map(script => script.src));

            // Check if Vue is loaded
            console.log('Vue app element:', document.getElementById('app'));
            console.log('Vue mounted:', document.getElementById('app')?.children.length > 0);
        };

        window.buildAssets = function() {
            console.log('📦 To build assets for production:');
            console.log('1. Run: npm install');
            console.log('2. Run: npm run build');
            console.log('3. Check: public/build/ folder exists');
            console.log('4. Refresh this page');
        };

        console.log('🚀 Laravel Vue Dashboard Pro - Ready!');
        console.log('📦 Environment: {{ app()->environment() }}');
        console.log('🛠️ Helpers: clearAll(), checkAssets(), buildAssets()');
    </script>
</body>
</html>
