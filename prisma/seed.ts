import {AuthType, PrismaClient} from '@prisma/client';
import { encrypt } from '../lib/crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 점검 명령어 생성
    const checkCommands = [
        {
            name: '시간 점검',
            command: 'date "+%Y-%m-%d %H:%M:%S"',
            description: '서버 시간 확인 및 표준 시간과 비교',
        },
        {
            name: '하드 용량 점검',
            command: 'df -h',
            description: '디스크 사용률 점검 (전체 파일시스템)',
        },
        {
            name: '메모리 사용량 점검',
            command: 'head /proc/meminfo',
            description: '메모리 사용률 점검 (MemTotal, MemAvailable)',
        },
        {
            name: 'CPU 사용량 점검',
            command: 'top -b -n1 -p 1 | fgrep "%Cpu" | tail -1 | awk -F\'id,\' \'{ split($1, vs, ","); v=vs[length(vs)]; sub("%", "", v); printf "%.2f", 100 - v }\'',
            description: 'CPU 사용률 점검 (idle 시간 기반 계산)',
        },
        {
            name: 'DB 백업 파일 점검',
            command: 'ls -al /backup',
            description: 'DB 백업 파일 목록 확인 (날짜, 시간, 크기 검증)',
        },
        {
            name: 'DB log 파일 점검',
            command: 'sudo ls -al /var/log/mysql',
            description: 'DB 로그 파일 목록 확인',
        },
    ];

    console.log('Creating check commands...');
    for (const cmd of checkCommands) {
        await prisma.checkCommand.upsert({
            where: {name: cmd.name},
            update: {},
            create: cmd,
        });
    }
    console.log(`✓ Created ${checkCommands.length} check commands`);

    // 인증 정보 생성
    const credentials = [
        {
            name: 'test Account',
            username: 'test',
            authType: AuthType.password,
            password: 'testtest',
            description: 'test 계정',
        },
    ];

    console.log('Creating credentials...');
    const createdCredentials: { [key: string]: number } = {};
    for (const cred of credentials) {
        const credential = await prisma.credential.upsert({
            where: { name: cred.name },
            update: {},
            create: {
                name: cred.name,
                username: cred.username,
                authType: cred.authType,
                password: cred.password ? encrypt(cred.password) : null,
                privateKey: null,
                description: cred.description,
            },
        });
        createdCredentials[cred.name] = credential.id;
    }
    console.log(`✓ Created ${credentials.length} credentials`);

    // 서버 생성 (credential 참조)
    const servers = [
        {
            name: 'test_server',
            description: 'TEST 서버',
            host: '12345',
            port: 22,
            credentialId: createdCredentials['test Account'],
            dbBackupLogPath: '/backup',
            dbGeneralLogPath: '/var/log/mysql',
            // vpnProfileId: 2,
            executionLocation: 'client' as const,
        },
    ];

    console.log('Creating servers...');
    for (const server of servers) {
        await prisma.server.upsert({
            where: { name: server.name },
            update: {},
            create: server,
        });
    }
    console.log(`✓ Created ${servers.length} servers`);

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
