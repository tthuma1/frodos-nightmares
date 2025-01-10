import { mat4 } from 'glm';

import { Camera } from './Camera.js';
import { Model } from './Model.js';
import { Transform } from './Transform.js';
import { getTransformedAABB } from '../../Physics.js';

export function getLocalModelMatrix(node) {
    const matrix = mat4.create();
    for (const transform of node.getComponentsOfType(Transform)) {
        matrix.multiply(transform.matrix);
    }
    return matrix;
}

export function getGlobalModelMatrix(node) {
    if (node.parent) {
        const parentMatrix = getGlobalModelMatrix(node.parent);
        const modelMatrix = getLocalModelMatrix(node);
        return parentMatrix.multiply(modelMatrix);
    } else {
        return getLocalModelMatrix(node);
    }
}

export function getLocalViewMatrix(node) {
    return getLocalModelMatrix(node).invert();
}

export function getGlobalViewMatrix(node) {
    return getGlobalModelMatrix(node).invert();
}

export function getProjectionMatrix(node) {
    return node.getComponentOfType(Camera)?.projectionMatrix ?? mat4.create();
}

export function extractFrustumPlanes(viewProjectionMatrix) {
    const planes = [];
    for (let i = 0; i < 6; i++) planes.push({ normal: [0, 0, 0], constant: 0 });

    planes[0].normal[0] = viewProjectionMatrix[3] + viewProjectionMatrix[0];
    planes[0].normal[1] = viewProjectionMatrix[7] + viewProjectionMatrix[4];
    planes[0].normal[2] = viewProjectionMatrix[11] + viewProjectionMatrix[8];
    planes[0].constant = viewProjectionMatrix[15] + viewProjectionMatrix[12];

    planes[1].normal[0] = viewProjectionMatrix[3] - viewProjectionMatrix[0];
    planes[1].normal[1] = viewProjectionMatrix[7] - viewProjectionMatrix[4];
    planes[1].normal[2] = viewProjectionMatrix[11] - viewProjectionMatrix[8];
    planes[1].constant = viewProjectionMatrix[15] - viewProjectionMatrix[12];

    planes[2].normal[0] = viewProjectionMatrix[3] + viewProjectionMatrix[1];
    planes[2].normal[1] = viewProjectionMatrix[7] + viewProjectionMatrix[5];
    planes[2].normal[2] = viewProjectionMatrix[11] + viewProjectionMatrix[9];
    planes[2].constant = viewProjectionMatrix[15] + viewProjectionMatrix[13];

    planes[3].normal[0] = viewProjectionMatrix[3] - viewProjectionMatrix[1];
    planes[3].normal[1] = viewProjectionMatrix[7] - viewProjectionMatrix[5];
    planes[3].normal[2] = viewProjectionMatrix[11] - viewProjectionMatrix[9];
    planes[3].constant = viewProjectionMatrix[15] - viewProjectionMatrix[13];

    planes[4].normal[0] = viewProjectionMatrix[3] + viewProjectionMatrix[2];
    planes[4].normal[1] = viewProjectionMatrix[7] + viewProjectionMatrix[6];
    planes[4].normal[2] = viewProjectionMatrix[11] + viewProjectionMatrix[10];
    planes[4].constant = viewProjectionMatrix[15] + viewProjectionMatrix[14];

    planes[5].normal[0] = viewProjectionMatrix[3] - viewProjectionMatrix[2];
    planes[5].normal[1] = viewProjectionMatrix[7] - viewProjectionMatrix[6];
    planes[5].normal[2] = viewProjectionMatrix[11] - viewProjectionMatrix[10];
    planes[5].constant = viewProjectionMatrix[15] - viewProjectionMatrix[14];

    for (const plane of planes) {
        const length = Math.hypot(...plane.normal);
        plane.normal[0] /= length;
        plane.normal[1] /= length;
        plane.normal[2] /= length;
        plane.constant /= length;
    }

    return planes;
}

export function isAABBInsideFrustum(aabb, planes) {
    const { min, max } = aabb;

    for (const plane of planes) {
        const { normal, constant } = plane;

        const pVertex = [
            normal[0] > 0 ? max[0] : min[0],
            normal[1] > 0 ? max[1] : min[1],
            normal[2] > 0 ? max[2] : min[2],
        ];

        const distance = normal[0] * pVertex[0] + normal[1] * pVertex[1] + normal[2] * pVertex[2] + constant;
        if (distance < 0) {
            return false;
        }
    }

    return true;
}

