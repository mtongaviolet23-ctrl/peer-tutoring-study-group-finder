import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverDirectory = fileURLToPath(new URL('..', import.meta.url));

const waitForServer = async (child, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:4111/api/health');
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  child.kill();
  throw new Error('Server did not start in time.');
};

test('authenticated account and session flows work end to end', async (t) => {
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      PORT: '4111',
      DATABASE_URL: '',
      NODE_ENV: 'test',
      AUTH_TOKEN_SECRET: 'test-secret-at-least-32-characters-long',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(() => child.kill('SIGTERM'));
  await waitForServer(child);

  const registerResponse = await fetch('http://127.0.0.1:4111/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Student',
      email: 'test.student@unza.zm',
      password: 'testpass123',
      role: 'student',
      department: 'School of Natural Sciences',
      programOfStudy: 'Computer Science',
      studentNumber: '202600123',
    }),
  });
  assert.equal(registerResponse.status, 201);
  const registered = await registerResponse.json();
  assert.equal(registered.success, true);
  assert.ok(registered.data.token);
  assert.equal(registered.data.user.programOfStudy, 'Computer Science');
  assert.equal(registered.data.user.studentNumber, '202600123');

  const profileResponse = await fetch('http://127.0.0.1:4111/api/auth/profile', {
    headers: { Authorization: `Bearer ${registered.data.token}` },
  });
  assert.equal(profileResponse.status, 200);
  const profile = await profileResponse.json();
  assert.equal(profile.data.name, 'Test Student');
  assert.equal(profile.data.department, 'School of Natural Sciences');
  assert.equal(profile.data.programOfStudy, 'Computer Science');
  assert.equal(profile.data.studentNumber, '202600123');

  const updateResponse = await fetch('http://127.0.0.1:4111/api/auth/profile', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${registered.data.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Test Student Updated', department: 'School of Engineering', programOfStudy: 'Electrical Engineering', studentNumber: '202600456' }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.data.name, 'Test Student Updated');
  assert.equal(updated.data.programOfStudy, 'Electrical Engineering');
  assert.equal(updated.data.studentNumber, '202600456');

  const sessionResponse = await fetch('http://127.0.0.1:4111/api/sessions', {
    headers: { Authorization: `Bearer ${registered.data.token}` },
  });
  assert.equal(sessionResponse.status, 200);
  const sessions = await sessionResponse.json();
  assert.ok(Array.isArray(sessions.data));

  const groupsResponse = await fetch('http://127.0.0.1:4111/api/groups');
  const groups = await groupsResponse.json();
  const tutorsResponse = await fetch('http://127.0.0.1:4111/api/tutors');
  const tutors = await tutorsResponse.json();
  assert.ok(tutors.data.some((tutor) => tutor.name === 'Demo Tutor Leya M.'));
  assert.ok(groups.data.some((group) => group.name === 'Calculus Practice Circle'));
  const firstGroup = groups.data[0];
  const joinResponse = await fetch(`http://127.0.0.1:4111/api/groups/${firstGroup.id}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${registered.data.token}` },
  });
  assert.equal(joinResponse.status, 202);
  const joinRequest = await joinResponse.json();
  assert.deepEqual(joinRequest.data, { groupId: firstGroup.id, status: 'pending' });

  const membershipsResponse = await fetch('http://127.0.0.1:4111/api/groups/memberships', {
    headers: { Authorization: `Bearer ${registered.data.token}` },
  });
  const memberships = await membershipsResponse.json();
  assert.equal(memberships.data.includes(firstGroup.id), false);

  const pendingRequestsResponse = await fetch('http://127.0.0.1:4111/api/groups/requests', {
    headers: { Authorization: `Bearer ${registered.data.token}` },
  });
  const pendingRequests = await pendingRequestsResponse.json();
  assert.ok(pendingRequests.data.includes(firstGroup.id));

  const groupsAfterRequestResponse = await fetch('http://127.0.0.1:4111/api/groups');
  const groupsAfterRequest = await groupsAfterRequestResponse.json();
  assert.equal(groupsAfterRequest.data.find((group) => group.id === firstGroup.id).members, firstGroup.members);

  const duplicateJoinResponse = await fetch(`http://127.0.0.1:4111/api/groups/${firstGroup.id}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${registered.data.token}` },
  });
  assert.equal(duplicateJoinResponse.status, 409);
  assert.match((await duplicateJoinResponse.json()).message, /already pending/i);

  const resourcesResponse = await fetch('http://127.0.0.1:4111/api/resources?courseCode=CS201');
  const resources = await resourcesResponse.json();
  assert.equal(resources.data.length, 1);
  assert.equal(resources.data[0].courseCode, 'CS201');
  assert.equal('content' in resources.data[0], false);

  const downloadResponse = await fetch(`http://127.0.0.1:4111/api${resources.data[0].downloadUrl}`);
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /CS201-data-structures-revision\.txt/);
  assert.match(await downloadResponse.text(), /DATA STRUCTURES REVISION SHEET/);

  const missingDownloadResponse = await fetch('http://127.0.0.1:4111/api/resources/999/download');
  assert.equal(missingDownloadResponse.status, 404);

  const quizzesResponse = await fetch('http://127.0.0.1:4111/api/quizzes?courseCode=CS201');
  const quizzes = await quizzesResponse.json();
  assert.equal(quizzes.data.length, 1);
  assert.equal(quizzes.data[0].questions.length, 3);
  assert.equal('correctIndex' in quizzes.data[0].questions[0], false);
  assert.equal('explanation' in quizzes.data[0].questions[0], false);

  const incompleteAttemptResponse = await fetch(`http://127.0.0.1:4111/api/quizzes/${quizzes.data[0].id}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [1] }),
  });
  assert.equal(incompleteAttemptResponse.status, 400);

  const quizAttemptResponse = await fetch(`http://127.0.0.1:4111/api/quizzes/${quizzes.data[0].id}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [1, 0, 2] }),
  });
  assert.equal(quizAttemptResponse.status, 200);
  const quizAttempt = await quizAttemptResponse.json();
  assert.equal(quizAttempt.data.score, 3);
  assert.equal(quizAttempt.data.total, 3);
  assert.equal(quizAttempt.data.results[0].isCorrect, true);
  assert.match(quizAttempt.data.results[0].explanation, /stack/i);
});
