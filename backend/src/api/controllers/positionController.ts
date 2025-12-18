import { Request, Response } from 'express';

export class PositionController {
  // TODO: Implement position controller methods
  static async getAll(req: Request, res: Response) {
    res.json({ message: 'Get all positions' });
  }

  static async getByDeviceId(req: Request, res: Response) {
    res.json({ message: 'Get positions by device ID' });
  }

  static async getById(req: Request, res: Response) {
    res.json({ message: 'Get position by ID' });
  }
}
