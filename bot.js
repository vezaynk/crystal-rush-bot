/**
 * Deliver more ore to hq (left side of the map) than your opponent. Use radars to find ore but beware of traps!
 **/

var inputs = readline().split(' ');
const width = parseInt(inputs[0]);
const height = parseInt(inputs[1]); // size of the map

const DUMMY_POSITION = {
    x: Infinity,
    y: Infinity
}

// const oreCache = Array(15).fill(0).map(() => Array(30));

const riskFactor = Array(30).fill(0).map(() => Array(15).fill(1));
const holeGrid = Array(30).fill(0).map(() => Array(15));
const radarGrid = Array(30).fill(0).map(() => Array(15));

let previousEnemyPositions = new Map();

function getDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function findNearest(start, coords) {
    let target = DUMMY_POSITION;
    let currentRisk = Infinity;

    for (let end of coords) {
        const newDistance = getDistance(start, end);
        const newRisk = riskFactor[end.x][end.y];
        const oldRisk = currentRisk;
        const oldDistance = getDistance(start, target);

        if ((newRisk < oldRisk && newRisk != Infinity) || (newRisk == oldRisk && newDistance < oldDistance)) { 
            target = end; 
            currentRisk = newRisk;
            continue;
        };
    }
    console.error(target, "with risk", currentRisk);
    return target;
}
const radarSpots = [];
for (let x = 4; x < width; x += 6) {
    for (let y = 3; y < height; y += 6) {
        radarSpots.push({
            x, y
        })
    }
}

// game loop
while (true) {
    var inputs = readline().split(' ');
    const myScore = parseInt(inputs[0]); // Amount of ore delivered
    const opponentScore = parseInt(inputs[1]);
    const bots = [];
    const entities = [];

    const ores = []

    for (let y = 0; y < height; y++) {
        var inputs = readline().split(' ');
        for (let x = 0; x < width; x++) {
            const ore = inputs[2 * x];// amount of ore or "?" if unknown
            const hole = parseInt(inputs[2 * x + 1]);// 1 if cell has a hole


            if (hole) holeGrid[x][y] = true;

            if (ore != '?' && ore != 0) {
                ores.push({
                    x: x,
                    y: y,
                    ore
                })
            }
        }
    }
    // console.error(ores);
    //console.error(oreCache);
    var inputs = readline().split(' ');
    const entityCount = parseInt(inputs[0]); // number of entities visible to you
    const radarCooldown = parseInt(inputs[1]); // turns left until a new radar can be requested
    const trapCooldown = parseInt(inputs[2]); // turns left until a new trap can be requested
    // console.error("cooldowns", radarCooldown, trapCooldown);
    for (let i = 0; i < entityCount; i++) {
        var inputs = readline().split(' ');
        const entityId = parseInt(inputs[0]); // unique id of the entity
        const entityType = parseInt(inputs[1]); // 0 for your robot, 1 for other robot, 2 for radar, 3 for trap
        const x = parseInt(inputs[2]);
        const y = parseInt(inputs[3]); // position of the entity
        const item = parseInt(inputs[4]); // if this entity is a robot, the item it is carrying (-1 for NONE, 2 for RADAR, 3 for TRAP, 4 for ORE)


        entities.push({ entityId, entityType, x, y, item })

        if (entityType == 3) {
            riskFactor[x][y] = Infinity;
        }
        if (entityType == 2) {
            radarGrid[x][y] = true;
        }

        if (entityType == 0)
            bots.push({
                x, y, item, entityId
            })

        // Enemy
        if (entityType == 1) {
            const { x: oldX, y: oldY } = previousEnemyPositions.get(entityId) || DUMMY_POSITION;
            previousEnemyPositions.set(entityId, { x, y });
            // has not moved
            if (oldX == x && oldY == y) {
                // taint the holes
                if (y < height)
                    if (holeGrid[x][y + 1])
                        riskFactor[x][y + 1] += 0.25;

                if (y > 0)
                    if (holeGrid[x][y - 1])
                        riskFactor[x][y - 1] += 0.25;

                if (x < width)
                    if (holeGrid[x + 1][y])
                        riskFactor[x + 1][y] += 0.25;

                if (x > 0)
                    if (holeGrid[x - 1][y])
                        riskFactor[x - 1][y] += 0.25;
            }
        }
    }

    const remainingOres = new Set(ores);
    const emptyRadars = new Set(radarSpots.filter(s => !radarGrid[s.x][s.y]));
    let radarAvailable = radarCooldown == 0;
    let trapAvailable = trapCooldown == 0;

    // console.error(riskFactor);
    for (let { x, y, item, entityId } of bots) {
        // if (entityId != 0) { console.log("WAIT"); continue; }

        if (x == -1 && y == -1) { console.log("WAIT"); continue; }

        // Home, pick up item
        if (x == 0 && item == -1) {

            if (radarAvailable) {
                console.log("REQUEST RADAR");
                radarAvailable = false;
                continue;
            }


            if (trapAvailable && [...remainingOres].filter(o => o.ore > 1).length) {
                console.log("REQUEST TRAP");
                trapAvailable = false;
                continue;
            }
        }

        // nowhere to place radar
        if (!emptyRadars.size && item == 2) {
            console.error("Nowhere to place radar, going to dig")
            item = -1
        };
        switch (item) {
            case -1:
                {
                    console.error("Empty-handed, go do work");
                    let target = findNearest({ x, y }, remainingOres);
                    console.error("Selected orr", target);
                    if (target == DUMMY_POSITION) {
                        console.error("Get a radar");
                        console.log(`MOVE 0 ${y}`);
                    } else {
                        console.error("Go dig");
                        // Uncomment if multiple digs desirable
                        if (--target.ore == 0)
                            remainingOres.delete(target);
                        console.log(`DIG ${target.x} ${target.y}`);
                    }
                    break;
                }
            case 2: {
                console.error("Has Radar, go bury it");
                const { value: spot } = emptyRadars.values().next();
                console.log(`DIG ${spot.x} ${spot.y}`);
                emptyRadars.delete(spot);
                break;
            }
            case 3: {
                console.error("Has trap, go bury it");
                let target = findNearest({ x, y }, [...remainingOres].filter(ore => ore.ore > 1));
                if (target == DUMMY_POSITION) target = findNearest({ x, y }, remainingOres);
                console.error("Selected orr", target, riskFactor[target.x][target.y]);
                if (target == DUMMY_POSITION) {
                    console.error("Get a radar");
                    console.log(`MOVE 0 ${y}`);
                } else {
                    console.error("Go dig");
                    remainingOres.delete(target);
                    console.log(`DIG ${target.x} ${target.y}`);
                }
                break;
            }
            case 4:
                {
                    console.error("has crystal, bring it home");
                    console.log(`MOVE 0 ${y}`);
                    break;
                }
        }
    }
}
