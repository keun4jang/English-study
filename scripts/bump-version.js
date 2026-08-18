#!/usr/bin/env node
/**
 * 버전 증가 스크립트 — package.json과 app.json(expo.version)을 동시에 갱신하고
 * CHANGELOG.md 상단에 새 섹션 템플릿을 추가한다.
 *
 * 사용법:
 *   npm run version:patch   # 0.1.0 -> 0.1.1 (요청된 변경 완료 시)
 *   npm run version:minor   # 0.1.x -> 0.2.0 (큰 기능 추가)
 *   npm run version:major   # 0.x.y -> 1.0.0 (정식 출시)
 */
const fs = require('fs');
const path = require('path');

const kind = process.argv[2];
if (!['patch', 'minor', 'major'].includes(kind)) {
  console.error('사용법: node scripts/bump-version.js <patch|minor|major>');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const appPath = path.join(root, 'app.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
const next =
  kind === 'major'
    ? `${major + 1}.0.0`
    : kind === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

pkg.version = next;
app.expo.version = next;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');

const today = new Date().toISOString().slice(0, 10);
const section = `## [${next}] - ${today}\n\n### 추가\n\n- \n\n### 변경\n\n- \n\n### 수정\n\n- \n\n`;
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const marker = '<!-- next-version -->';
  if (changelog.includes(marker)) {
    fs.writeFileSync(changelogPath, changelog.replace(marker, `${marker}\n\n${section.trim()}`));
  } else {
    fs.writeFileSync(changelogPath, `${section}${changelog}`);
  }
}

console.log(`버전 업데이트 완료: ${next}`);
console.log('CHANGELOG.md의 새 섹션을 채워주세요.');
