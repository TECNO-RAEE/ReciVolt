import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pointWorkspaceBackTarget } from '../src/models/Portal.ts';

test('PointWorkspace back returns to company points list only when editing from that list', () => {
  assert.equal(
    pointWorkspaceBackTarget({
      hasCompany: true,
      hasPointId: false,
      newPoint: false,
      isEditingPoint: true,
    }),
    'points_list'
  );
  assert.equal(
    pointWorkspaceBackTarget({
      hasCompany: true,
      hasPointId: false,
      newPoint: false,
      isEditingPoint: false,
    }),
    'workspace_parent'
  );
  assert.equal(
    pointWorkspaceBackTarget({
      hasCompany: false,
      hasPointId: false,
      newPoint: true,
      isEditingPoint: true,
    }),
    'workspace_parent'
  );
  assert.equal(
    pointWorkspaceBackTarget({
      hasCompany: true,
      hasPointId: false,
      newPoint: true,
      isEditingPoint: true,
    }),
    'workspace_parent'
  );
  assert.equal(
    pointWorkspaceBackTarget({
      hasCompany: true,
      hasPointId: true,
      newPoint: false,
      isEditingPoint: true,
    }),
    'workspace_parent'
  );
});
