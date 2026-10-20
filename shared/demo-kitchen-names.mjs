// Stable synthetic actor IDs; display labels explicitly approved for the presentation.
export const DEMO_KITCHEN_NAMES=Object.freeze(['Kainan','Davi','Carla','Elizabeth']);
export const DEMO_KITCHEN_ACTORS=Object.freeze(DEMO_KITCHEN_NAMES.map(name=>'demo.cozinha.'+name.toLowerCase()));
export const demoKitchenName=actor=>{const index=DEMO_KITCHEN_ACTORS.indexOf(actor);return index<0?null:DEMO_KITCHEN_NAMES[index]};
