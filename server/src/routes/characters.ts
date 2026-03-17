import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import db from '../db/index.js';
import { authenticate, requireProjectAccess, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = Router({ mergeParams: true });

// List characters
router.get('/', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const characters = db.prepare(`
    SELECT
      c.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      (SELECT COUNT(*) FROM character_relationships WHERE character_a_id = c.id OR character_b_id = c.id) as relationship_count
    FROM characters c
    LEFT JOIN users u ON u.id = c.created_by
    WHERE c.project_id = ?
    ORDER BY c.name ASC
  `).all(req.params.projectId);

  res.json((characters as Record<string, unknown>[]).map(c => ({
    ...c,
    aliases: c.aliases ? JSON.parse(c.aliases as string) : [],
    gallery: c.gallery ? JSON.parse(c.gallery as string) : [],
    tags: c.tags ? JSON.parse(c.tags as string) : []
  })));
});

// Create character
router.post('/', authenticate, requireProjectAccess('contributor'), [
  body('name').notEmpty().isLength({ max: 100 }),
  body('character_type').optional().isIn(['protagonist', 'antagonist', 'npc', 'puppet_master', 'ai', 'organization']),
  body('aliases').optional().isArray()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const {
    name, aliases, character_type, description, backstory, personality,
    motivations, secrets, avatar_url, gallery, voice_notes, speech_patterns,
    status, introduction_beat_id, tags, notes
  } = req.body;

  const characterId = uuidv4();

  db.prepare(`
    INSERT INTO characters (
      id, project_id, name, aliases, character_type, description, backstory,
      personality, motivations, secrets, avatar_url, gallery, voice_notes,
      speech_patterns, status, introduction_beat_id, tags, notes, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    characterId,
    req.params.projectId,
    name,
    aliases ? JSON.stringify(aliases) : null,
    character_type || 'npc',
    description || null,
    backstory || null,
    personality || null,
    motivations || null,
    secrets || null,
    avatar_url || null,
    gallery ? JSON.stringify(gallery) : null,
    voice_notes || null,
    speech_patterns || null,
    status || 'active',
    introduction_beat_id || null,
    tags ? JSON.stringify(tags) : null,
    notes || null,
    req.user!.id
  );

  logActivity(req.params.projectId, req.user!.id, 'created', 'character', characterId, name);

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId) as Record<string, unknown>;
  res.status(201).json({
    ...character,
    aliases: character.aliases ? JSON.parse(character.aliases as string) : [],
    gallery: character.gallery ? JSON.parse(character.gallery as string) : [],
    tags: character.tags ? JSON.parse(character.tags as string) : []
  });
});

// Get single character
router.get('/:characterId', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const character = db.prepare(`
    SELECT
      c.*,
      u.username as created_by_username,
      u.display_name as created_by_name,
      sb.title as introduction_beat_title
    FROM characters c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN story_beats sb ON sb.id = c.introduction_beat_id
    WHERE c.id = ? AND c.project_id = ?
  `).get(req.params.characterId, req.params.projectId) as Record<string, unknown> | undefined;

  if (!character) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  // Get relationships
  const relationships = db.prepare(`
    SELECT
      cr.*,
      CASE
        WHEN cr.character_a_id = ? THEN cb.id
        ELSE ca.id
      END as related_character_id,
      CASE
        WHEN cr.character_a_id = ? THEN cb.name
        ELSE ca.name
      END as related_character_name,
      CASE
        WHEN cr.character_a_id = ? THEN cb.avatar_url
        ELSE ca.avatar_url
      END as related_character_avatar
    FROM character_relationships cr
    JOIN characters ca ON ca.id = cr.character_a_id
    JOIN characters cb ON cb.id = cr.character_b_id
    WHERE cr.character_a_id = ? OR cr.character_b_id = ?
  `).all(
    req.params.characterId, req.params.characterId, req.params.characterId,
    req.params.characterId, req.params.characterId
  );

  // Get digital properties owned by this character
  const digitalProperties = db.prepare(`
    SELECT id, name, property_type, url, platform, status
    FROM digital_properties
    WHERE owner_character_id = ?
  `).all(req.params.characterId);

  res.json({
    ...character,
    aliases: character.aliases ? JSON.parse(character.aliases as string) : [],
    gallery: character.gallery ? JSON.parse(character.gallery as string) : [],
    tags: character.tags ? JSON.parse(character.tags as string) : [],
    relationships,
    digitalProperties
  });
});

// Update character
router.patch('/:characterId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  const allowedFields = [
    'name', 'character_type', 'description', 'backstory', 'personality',
    'motivations', 'secrets', 'avatar_url', 'voice_notes', 'speech_patterns',
    'status', 'introduction_beat_id', 'notes'
  ];

  const updates: string[] = [];
  const values: (string | null)[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  // Handle JSON fields
  if (req.body.aliases !== undefined) {
    updates.push('aliases = ?');
    values.push(JSON.stringify(req.body.aliases));
  }
  if (req.body.gallery !== undefined) {
    updates.push('gallery = ?');
    values.push(JSON.stringify(req.body.gallery));
  }
  if (req.body.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(req.body.tags));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.characterId);
  values.push(req.params.projectId);

  db.prepare(`
    UPDATE characters SET ${updates.join(', ')} WHERE id = ? AND project_id = ?
  `).run(...values);

  logActivity(req.params.projectId, req.user!.id, 'updated', 'character', req.params.characterId, req.body.name);

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.characterId) as Record<string, unknown>;
  res.json({
    ...character,
    aliases: character.aliases ? JSON.parse(character.aliases as string) : [],
    gallery: character.gallery ? JSON.parse(character.gallery as string) : [],
    tags: character.tags ? JSON.parse(character.tags as string) : []
  });
});

// Delete character
router.delete('/:characterId', authenticate, requireProjectAccess('lead'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM character_relationships WHERE character_a_id = ? OR character_b_id = ?')
    .run(req.params.characterId, req.params.characterId);
  db.prepare('DELETE FROM characters WHERE id = ? AND project_id = ?')
    .run(req.params.characterId, req.params.projectId);

  logActivity(req.params.projectId, req.user!.id, 'deleted', 'character', req.params.characterId);

  res.json({ message: 'Character deleted' });
});

// Character Relationships

// Get relationships
router.get('/:characterId/relationships', authenticate, requireProjectAccess('viewer'), (req: AuthRequest, res: Response) => {
  const relationships = db.prepare(`
    SELECT
      cr.*,
      ca.name as character_a_name,
      ca.avatar_url as character_a_avatar,
      cb.name as character_b_name,
      cb.avatar_url as character_b_avatar
    FROM character_relationships cr
    JOIN characters ca ON ca.id = cr.character_a_id
    JOIN characters cb ON cb.id = cr.character_b_id
    WHERE cr.character_a_id = ? OR cr.character_b_id = ?
  `).all(req.params.characterId, req.params.characterId);

  res.json(relationships);
});

// Create relationship
router.post('/:characterId/relationships', authenticate, requireProjectAccess('contributor'), [
  body('related_character_id').isUUID(),
  body('relationship_type').notEmpty().isLength({ max: 50 }),
  body('description').optional()
], (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { related_character_id, relationship_type, description, is_public } = req.body;

  // Check if relationship already exists
  const existing = db.prepare(`
    SELECT id FROM character_relationships
    WHERE (character_a_id = ? AND character_b_id = ?)
       OR (character_a_id = ? AND character_b_id = ?)
  `).get(
    req.params.characterId, related_character_id,
    related_character_id, req.params.characterId
  );

  if (existing) {
    res.status(409).json({ error: 'Relationship already exists' });
    return;
  }

  const relationshipId = uuidv4();

  db.prepare(`
    INSERT INTO character_relationships (id, project_id, character_a_id, character_b_id, relationship_type, description, is_public)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    relationshipId,
    req.params.projectId,
    req.params.characterId,
    related_character_id,
    relationship_type,
    description || null,
    is_public !== false ? 1 : 0
  );

  const relationship = db.prepare('SELECT * FROM character_relationships WHERE id = ?').get(relationshipId);
  res.status(201).json(relationship);
});

// Delete relationship
router.delete('/:characterId/relationships/:relationshipId', authenticate, requireProjectAccess('contributor'), (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM character_relationships WHERE id = ? AND project_id = ?')
    .run(req.params.relationshipId, req.params.projectId);

  res.json({ message: 'Relationship deleted' });
});

export default router;
