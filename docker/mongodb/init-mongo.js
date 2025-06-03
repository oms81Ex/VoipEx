db = db.getSiblingDB('admin');

// 데이터베이스별 사용자 생성
const databases = ['voip_auth', 'voip_users', 'voip_calls'];

databases.forEach(dbName => {
  db = db.getSiblingDB(dbName);

  db.createUser({
    user: 'voip_user',
    pwd: '12qwaszx',
    roles: [
      {
        role: 'readWrite',
        db: dbName
      }
    ]
  });

  // 초기 인덱스 생성
  if (dbName === 'voip_users') {
    db.users.createIndex({ email: 1 }, { unique: true });
    db.users.createIndex({ createdAt: -1 });
  }

  if (dbName === 'voip_calls') {
    db.calls.createIndex({ callerId: 1, startTime: -1 });
    db.calls.createIndex({ calleeId: 1, startTime: -1 });
  }
});
