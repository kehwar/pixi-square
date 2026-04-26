import { ComponentSystem } from './ComponentSystem'

// --- Marker component class ---

export class PathfindingSystem extends ComponentSystem<object> {}

// Legacy alias for call sites that use `Pathfinding` as the component token
export const Pathfinding = PathfindingSystem
