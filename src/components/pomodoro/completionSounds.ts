import alarm from "@/assets/sounds/mixkit-classic-alarm-995.wav";
import geese from "@/assets/sounds/mixkit-flock-of-wild-geese-20.wav";
import intro from "@/assets/sounds/mixkit-intro-transition-1146.wav";
import birds from "@/assets/sounds/mixkit-little-birds-singing-in-the-trees-17.wav";
import flute from "@/assets/sounds/mixkit-melodical-flute-music-notification-2310.wav";
import trombone from "@/assets/sounds/mixkit-sad-game-over-trombone-471.wav";
import futuristic from "@/assets/sounds/mixkit-technological-futuristic-hum-2133.wav";
import clock from "@/assets/sounds/mixkit-tick-tock-clock-timer-1045.wav";
import trumpet from "@/assets/sounds/mixkit-trumpet-fanfare-2293.wav";
import telephone from "@/assets/sounds/mixkit-vintage-telephone-ringtone-1356.wav";

export const completionSounds = [
	{ id: "alarm", label: "Classic alarm", source: alarm },
	{ id: "birds", label: "Little birds", source: birds },
	{ id: "clock", label: "Tick tock clock", source: clock },
	{ id: "flute", label: "Melodical flute", source: flute },
	{ id: "futuristic", label: "Futuristic hum", source: futuristic },
	{ id: "geese", label: "Wild geese", source: geese },
	{ id: "intro", label: "Intro transition", source: intro },
	{ id: "telephone", label: "Vintage telephone", source: telephone },
	{ id: "trombone", label: "Sad game over", source: trombone },
	{ id: "trumpet", label: "Trumpet fanfare", source: trumpet },
] as const;

export type CompletionSoundId = (typeof completionSounds)[number]["id"];
export const defaultCompletionSound: CompletionSoundId = "alarm";

export function isCompletionSoundId(
	value: unknown,
): value is CompletionSoundId {
	return completionSounds.some((sound) => sound.id === value);
}

export function getCompletionSound(id: CompletionSoundId) {
	return (
		completionSounds.find((sound) => sound.id === id) ?? completionSounds[0]
	);
}
