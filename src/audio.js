// AudioManager - Procedural spy satellite ambient audio using Web Audio API
// No external files required - all sounds generated with oscillators

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.ambientOscillator = null;
        this.volume = 0.3;
        this.muted = false;
        this.isAmbientPlaying = false;
        
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.updateVolume();
            
            console.log('🔊 AudioManager initialized');
        } catch (error) {
            console.warn('⚠️ Web Audio API not supported:', error);
        }
    }
    
    // Resume audio context if suspended (required by browsers)
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    
    // Radar ping sound - short, high-pitched beep
    async playPing() {
        if (!this.audioContext || this.muted) return;
        
        await this.resumeContext();
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // High-pitched ping
        oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
        
        // Sharp attack and decay
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
        
        oscillator.type = 'sine';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    // Alert chime - warning sound
    async playAlert() {
        if (!this.audioContext || this.muted) return;
        
        await this.resumeContext();
        
        // Create a two-tone alert
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);
        
        // Two-tone frequencies
        osc1.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc2.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        
        // Alternating pattern
        gain1.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        gain2.gain.setValueAtTime(0, this.audioContext.currentTime);
        
        gain1.gain.setValueAtTime(0, this.audioContext.currentTime + 0.2);
        gain2.gain.setValueAtTime(0.6, this.audioContext.currentTime + 0.2);
        
        gain1.gain.setValueAtTime(0.6, this.audioContext.currentTime + 0.4);
        gain2.gain.setValueAtTime(0, this.audioContext.currentTime + 0.4);
        
        // Fade out
        gain1.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.8);
        gain2.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.8);
        
        osc1.type = 'square';
        osc2.type = 'square';
        osc1.start(this.audioContext.currentTime);
        osc2.start(this.audioContext.currentTime);
        osc1.stop(this.audioContext.currentTime + 0.8);
        osc2.stop(this.audioContext.currentTime + 0.8);
    }
    
    // Start ambient hum - continuous background sound
    async startAmbient() {
        if (!this.audioContext || this.muted || this.isAmbientPlaying) return;
        
        await this.resumeContext();
        
        // Low frequency hum with subtle modulation
        this.ambientOscillator = this.audioContext.createOscillator();
        const ambientGain = this.audioContext.createGain();
        const lfo = this.audioContext.createOscillator(); // Low frequency oscillator for modulation
        const lfoGain = this.audioContext.createGain();
        
        // Setup modulation
        lfo.frequency.setValueAtTime(0.5, this.audioContext.currentTime); // Very slow modulation
        lfoGain.gain.setValueAtTime(20, this.audioContext.currentTime); // Modulation depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(this.ambientOscillator.frequency);
        
        // Main ambient sound
        this.ambientOscillator.frequency.setValueAtTime(60, this.audioContext.currentTime); // Base frequency
        this.ambientOscillator.type = 'sawtooth';
        
        this.ambientOscillator.connect(ambientGain);
        ambientGain.connect(this.masterGain);
        
        // Very quiet ambient level
        ambientGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        ambientGain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 2);
        
        this.ambientOscillator.start(this.audioContext.currentTime);
        lfo.start(this.audioContext.currentTime);
        
        this.isAmbientPlaying = true;
        this.ambientGainNode = ambientGain;
        this.ambientLfo = lfo;
        
        console.log('🎵 Ambient audio started');
    }
    
    // Stop ambient sound
    stopAmbient() {
        if (this.ambientOscillator && this.isAmbientPlaying) {
            this.ambientGainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
            this.ambientOscillator.stop(this.audioContext.currentTime + 1);
            this.ambientLfo.stop(this.audioContext.currentTime + 1);
            this.ambientOscillator = null;
            this.isAmbientPlaying = false;
            console.log('🔇 Ambient audio stopped');
        }
    }
    
    // Volume controls
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        this.updateVolume();
    }
    
    updateVolume() {
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.volume;
        }
    }
    
    toggleMute() {
        this.muted = !this.muted;
        this.updateVolume();
        console.log(`🔊 Audio ${this.muted ? 'MUTED' : 'UNMUTED'}`);
        return this.muted;
    }
    
    getMuted() {
        return this.muted;
    }
    
    getVolume() {
        return this.volume;
    }
}

// Create global audio manager instance
window.audioManager = new AudioManager();