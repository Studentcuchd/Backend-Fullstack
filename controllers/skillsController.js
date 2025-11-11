import Skill from '../models/Skill.js';

export const getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find().sort({ createdAt: -1 });
    res.json(skills);
  } catch (err) {
    next(err);
  }
};

export const getSkillById = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      res.status(404);
      throw new Error('Skill not found');
    }
    res.json(skill);
  } catch (err) {
    next(err);
  }
};

export const createSkill = async (req, res, next) => {
  try {
    const { name, category, level, description, resources } = req.body;
    if (!name) {
      res.status(400);
      throw new Error('Name is required');
    }
    const skill = await Skill.create({
      name,
      category,
      level,
      description,
      resources,
      createdBy: req.user?._id
    });
    res.status(201).json(skill);
  } catch (err) {
    next(err);
  }
};

export const updateSkill = async (req, res, next) => {
  try {
    const updates = {};
    const allowed = ['name', 'category', 'level', 'description', 'resources', 'isCompleted'];
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    const updated = await Skill.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updated) {
      res.status(404);
      throw new Error('Skill not found');
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      res.status(404);
      throw new Error('Skill not found');
    }
    await skill.deleteOne();
    res.json({ message: 'Skill removed' });
  } catch (err) {
    next(err);
  }
};
