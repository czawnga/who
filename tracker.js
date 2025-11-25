// Advanced Visitor Tracker with Geolocation
// Add this script to your main website HTML before </body> tag

(function() {
    'use strict';
    
    // ===== YOUR SUPABASE CONFIGURATION =====
    const SUPABASE_URL = 'https://czawohksxfoesonhpyke.supabase.co';
    const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';  // REPLACE THIS with your anon public key
    
    function generateSessionId() {
        const stored = localStorage.getItem('visitor_session_id');
        if (stored) {
            const sessionData = JSON.parse(stored);
            if (Date.now() - sessionData.lastActive < 30 * 60 * 1000) {
                sessionData.lastActive = Date.now();
                localStorage.setItem('visitor_session_id', JSON.stringify(sessionData));
                return sessionData.id;
            }
        }
        
        const newId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const sessionData = {
            id: newId,
            lastActive: Date.now(),
            startTime: Date.now()
        };
        localStorage.setItem('visitor_session_id', JSON.stringify(sessionData));
        return newId;
    }

    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown', version = 'Unknown';
        
        if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Edg') > -1) {
            browser = 'Edge';
            version = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
            version = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
            browser = 'Internet Explorer';
        }
        
        return { browser, version };
    }

    function getOSInfo() {
        const ua = navigator.userAgent;
        let os = 'Unknown', version = 'Unknown';
        
        if (ua.indexOf('Windows NT 10') > -1) {
            os = 'Windows';
            version = '10/11';
        } else if (ua.indexOf('Windows NT 6.3') > -1) {
            os = 'Windows';
            version = '8.1';
        } else if (ua.indexOf('Windows NT 6.2') > -1) {
            os = 'Windows';
            version = '8';
        } else if (ua.indexOf('Windows NT 6.1') > -1) {
            os = 'Windows';
            version = '7';
        } else if (ua.indexOf('Windows') > -1) {
            os = 'Windows';
        } else if (ua.indexOf('Mac OS X') > -1) {
            os = 'macOS';
            const match = ua.match(/Mac OS X ([0-9_]+)/);
            if (match) version = match[1].replace(/_/g, '.');
        } else if (ua.indexOf('Linux') > -1) {
            os = 'Linux';
        } else if (ua.indexOf('Android') > -1) {
            os = 'Android';
            const match = ua.match(/Android ([0-9.]+)/);
            if (match) version = match[1];
        } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
            os = 'iOS';
            const match = ua.match(/OS ([0-9_]+)/);
            if (match) version = match[1].replace(/_/g, '.');
        }
        
        return { os, version };
    }

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'Tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'Mobile';
        }
        return 'Desktop';
    }

    async function getGeolocation() {
        try {
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Geolocation API failed');
            }
            
            const data = await response.json();
            
            return {
                ip: data.ip || null,
                country: data.country_name || null,
                country_code: data.country_code || null,
                region: data.region || null,
                city: data.city || null,
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                timezone: data.timezone || null,
                isp: data.org || null
            };
        } catch (error) {
            console.warn('Geolocation tracking failed:', error);
            return {
                ip: null,
                country: null,
                country_code: null,
                region: null,
                city: null,
                latitude: null,
                longitude: null,
                timezone: null,
                isp: null
            };
        }
    }

    async function trackVisitor() {
        try {
            const sessionId = generateSessionId();
            const browserInfo = getBrowserInfo();
            const osInfo = getOSInfo();
            const geo = await getGeolocation();
            
            const visitorData = {
                session_id: sessionId,
                ip_address: geo.ip,
                country: geo.country,
                country_code: geo.country_code,
                region: geo.region,
                city: geo.city,
                latitude: geo.latitude,
                longitude: geo.longitude,
                timezone: geo.timezone,
                isp: geo.isp,
                browser: browserInfo.browser,
                browser_version: browserInfo.version,
                os: osInfo.os,
                os_version: osInfo.version,
                device_type: getDeviceType(),
                screen_width: window.screen.width,
                screen_height: window.screen.height,
                language: navigator.language || navigator.userLanguage,
                referrer: document.referrer || 'Direct',
                landing_page: window.location.href,
                current_page: window.location.href,
                is_return_visitor: localStorage.getItem('has_visited') === 'true',
                user_agent: navigator.userAgent
            };

            const response = await fetch(`${SUPABASE_URL}/rest/v1/visitors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(visitorData)
            });
            
            if (!response.ok) {
                throw new Error(`Tracking failed: ${response.statusText}`);
            }
            
            localStorage.setItem('has_visited', 'true');
            console.log('✅ Visitor tracked successfully');
        } catch (error) {
            console.error('❌ Visitor tracking error:', error);
        }
    }

    async function trackPageView() {
        try {
            const sessionId = generateSessionId();
            
            const pageData = {
                session_id: sessionId,
                page_url: window.location.href,
                page_title: document.title
            };

            await fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(pageData)
            });
            
            console.log('✅ Page view tracked');
        } catch (error) {
            console.error('❌ Page view tracking error:', error);
        }
    }

    let startTime = Date.now();
    let pageVisible = true;

    document.addEventListener('visibilitychange', () => {
        pageVisible = !document.hidden;
    });

    window.addEventListener('beforeunload', () => {
        if (pageVisible) {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            
            const sessionId = generateSessionId();
            const blob = new Blob([JSON.stringify({
                session_id: sessionId,
                page_url: window.location.href,
                page_title: document.title,
                time_on_page: timeSpent
            })], { type: 'application/json' });
            
            navigator.sendBeacon(
                `${SUPABASE_URL}/rest/v1/page_views?apikey=${SUPABASE_ANON_KEY}`,
                blob
            );
        }
    });

    function initTracking() {
        const tracked = sessionStorage.getItem('tracked_this_session');
        
        if (!tracked) {
            trackVisitor();
            sessionStorage.setItem('tracked_this_session', 'true');
        }
        
        trackPageView();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTracking);
    } else {
        initTracking();
    }

})();
