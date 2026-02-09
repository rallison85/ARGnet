import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './index.js';

console.log('🌱 Seeding database...');

try {
  // Create demo users
  const adminId = uuidv4();
  const writerId = uuidv4();
  const artistId = uuidv4();
  const programmerId = uuidv4();

  const passwordHash = bcrypt.hashSync('demo123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, username, password_hash, display_name, bio, skills, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    adminId,
    'admin@argstudio.xyz',
    'admin',
    passwordHash,
    'ARG Master',
    'Experienced ARG designer and puppet master.',
    JSON.stringify(['producer', 'designer', 'writer']),
    'admin'
  );

  insertUser.run(
    writerId,
    'writer@argstudio.xyz',
    'storyweaver',
    passwordHash,
    'Story Weaver',
    'Narrative designer specializing in interactive fiction.',
    JSON.stringify(['writer', 'designer']),
    'member'
  );

  insertUser.run(
    artistId,
    'artist@argstudio.xyz',
    'pixelmaker',
    passwordHash,
    'Pixel Maker',
    'Digital artist and prop designer.',
    JSON.stringify(['artist', 'designer']),
    'member'
  );

  insertUser.run(
    programmerId,
    'dev@argstudio.xyz',
    'codemaster',
    passwordHash,
    'Code Master',
    'Full-stack developer for ARG tech.',
    JSON.stringify(['programmer', 'designer']),
    'member'
  );

  // Create a demo project
  const projectId = uuidv4();

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, slug, description, tagline, status, genre, themes, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProject.run(
    projectId,
    'The Hollow Network',
    'hollow-network',
    'A mystery ARG about a shadowy organization manipulating social media and uncovering hidden truths about technological singularity.',
    'What lies beneath the surface of our connected world?',
    'development',
    'mystery',
    JSON.stringify(['technology', 'conspiracy', 'identity', 'truth']),
    adminId
  );

  // Add team members
  const insertMember = db.prepare(`
    INSERT INTO project_members (id, project_id, user_id, role, department, title)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertMember.run(uuidv4(), projectId, adminId, 'owner', 'production', 'Project Lead');
  insertMember.run(uuidv4(), projectId, writerId, 'lead', 'writing', 'Lead Writer');
  insertMember.run(uuidv4(), projectId, artistId, 'contributor', 'art', 'Visual Designer');
  insertMember.run(uuidv4(), projectId, programmerId, 'contributor', 'programming', 'Tech Lead');

  // Create story beats
  const insertBeat = db.prepare(`
    INSERT INTO story_beats (id, project_id, title, content, summary, beat_type, sequence_order, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const act1Id = uuidv4();
  insertBeat.run(
    act1Id,
    projectId,
    'Act 1: Discovery',
    'The players begin to notice strange patterns in their social media feeds. A mysterious account called @TheHollowNetwork starts following them.',
    'Players discover the existence of The Hollow Network',
    'chapter',
    1,
    'approved',
    adminId
  );

  const chapter1Id = uuidv4();
  insertBeat.run(
    chapter1Id,
    projectId,
    'Chapter 1: First Contact',
    'A cryptic message appears: "Not everything you see is real. Look deeper." Players receive their first puzzle.',
    'Initial mysterious contact',
    'chapter',
    1,
    'approved',
    writerId
  );

  // Create characters
  const insertCharacter = db.prepare(`
    INSERT INTO characters (id, project_id, name, aliases, character_type, description, personality, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const hollowId = uuidv4();
  insertCharacter.run(
    hollowId,
    projectId,
    'The Hollow Network',
    JSON.stringify(['THN', 'The Network', 'HLWNTWRK']),
    'organization',
    'A mysterious collective that seems to know things before they happen. Their true purpose is unknown.',
    'Cryptic, all-knowing, occasionally helpful but always unsettling',
    adminId
  );

  const alexId = uuidv4();
  insertCharacter.run(
    alexId,
    projectId,
    'Alex Chen',
    JSON.stringify(['A.C.', 'whistleblower42']),
    'protagonist',
    'A former tech company employee who discovered something they shouldn\'t have. Now on the run.',
    'Paranoid but determined, technically skilled, desperate to expose the truth',
    writerId
  );

  // Create puzzles
  const insertPuzzle = db.prepare(`
    INSERT INTO puzzles (id, project_id, story_beat_id, title, description, puzzle_type, difficulty, setup, solution, hints, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPuzzle.run(
    uuidv4(),
    projectId,
    chapter1Id,
    'The First Message',
    'Decode the initial cryptic message from The Hollow Network',
    'cipher',
    2,
    'Players receive an image on social media that contains a hidden message using steganography',
    'LOOK FOR THE PATTERN IN THE NOISE',
    JSON.stringify([
      'Check the image metadata',
      'The message is hidden in the least significant bits',
      'Use a steganography tool to extract the hidden text'
    ]),
    'approved',
    programmerId
  );

  insertPuzzle.run(
    uuidv4(),
    projectId,
    chapter1Id,
    'The Coordinates',
    'Find the location of the first dead drop',
    'coordinates',
    3,
    'A series of numbers are posted across multiple Hollow Network accounts that form GPS coordinates',
    '41.8827° N, 87.6233° W (Millennium Park, Chicago)',
    JSON.stringify([
      'Collect numbers from all THN social accounts',
      'The format is degrees-minutes-seconds',
      'The location is in Chicago'
    ]),
    'draft',
    writerId
  );

  // Create trail nodes
  const insertNode = db.prepare(`
    INSERT INTO trail_nodes (id, project_id, name, node_type, description, content_type, discovery_method, position_x, position_y)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const entryNode = uuidv4();
  insertNode.run(
    entryNode,
    projectId,
    'Social Media Discovery',
    'entry_point',
    'Players first encounter The Hollow Network through mysterious follows and messages',
    'character',
    'Organic social media discovery or word of mouth',
    100,
    100
  );

  const puzzleNode = uuidv4();
  insertNode.run(
    puzzleNode,
    projectId,
    'First Puzzle',
    'waypoint',
    'The steganography puzzle that reveals the first real clue',
    'puzzle',
    'Found in profile images on THN accounts',
    300,
    100
  );

  // Connect trail nodes
  const insertConnection = db.prepare(`
    INSERT INTO trail_connections (id, project_id, from_node_id, to_node_id, connection_type)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertConnection.run(uuidv4(), projectId, entryNode, puzzleNode, 'sequential');

  // Create tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, assigned_to, department, task_type, priority, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    uuidv4(),
    projectId,
    'Create THN Social Media Accounts',
    'Set up Twitter, Instagram, and TikTok accounts for The Hollow Network character',
    artistId,
    'art',
    'production',
    'high',
    'todo',
    adminId
  );

  insertTask.run(
    uuidv4(),
    projectId,
    'Design First Puzzle Assets',
    'Create the steganography image and supporting materials for the first puzzle',
    artistId,
    'art',
    'art',
    'high',
    'in_progress',
    adminId
  );

  insertTask.run(
    uuidv4(),
    projectId,
    'Build Puzzle Verification System',
    'Create backend system to track puzzle solutions and player progress',
    programmerId,
    'programming',
    'code',
    'medium',
    'todo',
    adminId
  );

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Demo accounts created:');
  console.log('  - admin@argstudio.xyz / demo123 (Admin)');
  console.log('  - writer@argstudio.xyz / demo123 (Writer)');
  console.log('  - artist@argstudio.xyz / demo123 (Artist)');
  console.log('  - dev@argstudio.xyz / demo123 (Developer)');
} catch (error) {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
}
