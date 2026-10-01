import * as THREE from 'three';
import type { Store } from './store';
import type { Street } from './street';
import { hazardOn, signalPhase, pedestrianPhase, nextDoorDelay, DOOR_OPEN_SECONDS, nextFlicker } from './rhythm';

type Lamp = Street['vehicleSignals'][number][number];

export interface HazardSignal {
  material: THREE.MeshBasicMaterial;
  lights: THREE.SpotLight[];
}

export interface AmbientDeps {
  store: Store;
  street: Street;
  hazard: HazardSignal;
}

export interface Ambient {
  tick(t: number, dt: number): void;
}

function setLamp(lamp: Lamp, on: boolean): void {
  lamp.m.color.copy(lamp.base).multiplyScalar(on ? 2.4 : 0.1);
}

export function createAmbient({ store, street, hazard }: AmbientDeps): Ambient {
  let doorT = 0;
  let doorTarget = 0;
  let nextDoorAt = nextDoorDelay(Math.random());
  let flickerUntil = -1;
  let nextFlickerAt = nextFlicker(Math.random(), Math.random()).wait;

  function tick(t: number, dt: number): void {
    if (t > nextDoorAt) {
      doorTarget = doorTarget ? 0 : 1;
      nextDoorAt = t + (doorTarget ? DOOR_OPEN_SECONDS : nextDoorDelay(Math.random()));
    }
    doorT += (doorTarget - doorT) * Math.min(1, dt * 3.2);
    store.doorLeft.position.x = -0.1 - doorT * 0.95;
    store.doorRight.position.x = 0.9 + doorT * 0.95;

    if (t > nextFlickerAt) {
      const flicker = nextFlicker(Math.random(), Math.random());
      flickerUntil = t + flicker.duration;
      nextFlickerAt = t + flicker.wait;
    }
    const flickerLevel = t < flickerUntil ? (Math.random() > 0.5 ? 0.95 : 0.4) : 0.95 + Math.sin(t * 7) * 0.02;
    store.fasciaMaterial.color.setScalar(flickerLevel);

    const hazardLit = hazardOn(t);
    hazard.material.color.set(hazardLit ? '#ffa21a' : '#3a2408');
    if (hazardLit) hazard.material.color.multiplyScalar(2.6);
    hazard.lights.forEach((light) => (light.intensity = hazardLit ? 5 : 0));

    const signal = signalPhase(t);
    const activeIndex = signal === 'green' ? 0 : signal === 'yellow' ? 1 : 2;
    street.vehicleSignals.forEach((head) => head.forEach((lamp, i) => setLamp(lamp, i === activeIndex)));
    street.signalLight.color.copy(street.vehicleSignals[0][activeIndex].base);

    const ped = pedestrianPhase(t);
    const blink = Math.floor(t * 4) % 2 === 0;
    const [pedMain, pedSide] = street.pedestrianSignals;
    setLamp(pedMain[0], ped.main === 'stop');
    setLamp(pedMain[1], ped.main === 'go' || (ped.main === 'blink' && blink));
    setLamp(pedSide[0], ped.side === 'stop');
    setLamp(pedSide[1], ped.side === 'go' || (ped.side === 'blink' && blink));

    (street.tvMaterial as THREE.MeshBasicMaterial).color
      .setRGB(0.45 + 0.25 * Math.sin(t * 3.1) + 0.15 * Math.sin(t * 11.7), 0.6 + 0.2 * Math.sin(t * 2.3), 1.1)
      .multiplyScalar(0.9);

    store.noboris.forEach((flag, i) => {
      flag.rotation.y = Math.sin(t * 1.3 + i) * 0.12;
    });
  }

  return { tick };
}
