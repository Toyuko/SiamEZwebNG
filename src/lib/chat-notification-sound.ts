let audioContext: AudioContext | null = null;

/** Call after user interaction so browsers allow playback. */
export function unlockChatNotificationSound(): void {
  if (typeof window === "undefined") return;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

/** Short ping for an incoming chat message. */
export function playChatNotificationSound(): void {
  if (typeof window === "undefined") return;

  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    const play = () => {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        660,
        audioContext.currentTime + 0.08
      );

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.22);
    };

    if (audioContext.state === "suspended") {
      void audioContext.resume().then(play);
      return;
    }

    play();
  } catch {
    // Autoplay may be blocked until the user interacts with the page.
  }
}
