# Fingerprinting detection patterns
# These patterns identify browser fingerprinting techniques in JavaScript code

FINGERPRINTING_PATTERNS = {
    'canvas': {
        'patterns': [
            'canvas.toDataURL',
            'canvas.toBlob',
            'getContext("2d")',
            'getContext(\'2d\')',
            'CanvasRenderingContext2D.prototype',
            'canvas.getImageData',
            'fillText',
            'strokeText'
        ],
        'severity': 'high',
        'description': 'Canvas fingerprinting - generates unique hash from rendered graphics'
    },
    'webgl': {
        'patterns': [
            'getContext("webgl")',
            'getContext(\'webgl\')',
            'getContext("experimental-webgl")',
            'WebGLRenderingContext',
            'getParameter(37445)',  # UNMASKED_VENDOR_WEBGL
            'getParameter(37446)',  # UNMASKED_RENDERER_WEBGL
            'getSupportedExtensions',
            'getShaderPrecisionFormat'
        ],
        'severity': 'high',
        'description': 'WebGL fingerprinting - identifies GPU and graphics capabilities'
    },
    'audio': {
        'patterns': [
            'AudioContext',
            'webkitAudioContext',
            'createOscillator',
            'createDynamicsCompressor',
            'createAnalyser',
            'getFloatFrequencyData',
            'getByteFrequencyData'
        ],
        'severity': 'medium',
        'description': 'Audio fingerprinting - detects unique audio processing characteristics'
    },
    'font': {
        'patterns': [
            'document.fonts',
            'FontFaceSet',
            'offsetWidth',
            'offsetHeight',
            'getBoundingClientRect',
            '@font-face'
        ],
        'severity': 'medium',
        'description': 'Font fingerprinting - detects installed fonts through measurement'
    },
    'device': {
        'patterns': [
            'navigator.plugins',
            'navigator.mimeTypes',
            'navigator.hardwareConcurrency',
            'navigator.deviceMemory',
            'navigator.getBattery',
            'navigator.maxTouchPoints',
            'screen.colorDepth',
            'screen.pixelDepth',
            'window.devicePixelRatio',
            'navigator.platform',
            'navigator.userAgent',
            'navigator.language',
            'navigator.languages',
            'Intl.DateTimeFormat().resolvedOptions().timeZone'
        ],
        'severity': 'low',
        'description': 'Device fingerprinting - collects system and browser properties'
    }
}


def detect_fingerprinting(script_content: str, script_url: str) -> list:
    # Analyze JavaScript code for fingerprinting patterns.
    # Returns list of detected fingerprinting techniques.
    
    detections = []
    
    for technique, config in FINGERPRINTING_PATTERNS.items():
        found_patterns = []
        
        for pattern in config['patterns']:
            if pattern in script_content:
                found_patterns.append(pattern)
        
        if found_patterns:
            detections.append({
                'technique': technique,
                'severity': config['severity'],
                'script_url': script_url,
                'evidence': {
                    'patterns_found': found_patterns[:5],  # Limit to first 5
                    'total_matches': len(found_patterns),
                    'description': config['description']
                }
            })
    
    return detections
