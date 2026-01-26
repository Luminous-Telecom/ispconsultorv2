import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import { Op, WhereOptions } from 'sequelize';

export interface ListScheduledRoutinesFilters {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface ListScheduledRoutinesResponse {
  success: boolean;
  data: ScheduledRoutine[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    current_page: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class ScheduledRoutineService {
  /**
   * Listar rotinas com filtros e paginação
   */
  static async list(filters: ListScheduledRoutinesFilters): Promise<ListScheduledRoutinesResponse> {
    const {
      page = 1,
      limit = 15,
      search,
      sort = 'created_at',
      direction = 'desc'
    } = filters;

    const offset = (Number(page) - 1) * Number(limit);
    let where: WhereOptions = {};

    // Filtro de busca
    if (search) {
      where = {
        [Op.or]: [
          { nome: { [Op.like]: `%${search}%` } },
          { tipo: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } }
        ]
      } as WhereOptions;
    }

    const routines = await ScheduledRoutine.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[sort as string, direction]]
    });

    const totalPages = Math.ceil(routines.count / Number(limit));
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const count = routines.count as number;
    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

    return {
      success: true,
      data: routines.rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: totalPages,
        current_page: pageNum,
        per_page: limitNum,
        last_page: totalPages,
        from,
        to
      }
    };
  }

  /**
   * Buscar rotina por ID
   */
  static async getById(id: number): Promise<ScheduledRoutine | null> {
    return await ScheduledRoutine.findByPk(id);
  }

  /**
   * Criar rotina
   */
  static async create(dados: Partial<ScheduledRoutine>): Promise<ScheduledRoutine> {
    return await ScheduledRoutine.create(dados as any);
  }

  /**
   * Atualizar rotina
   */
  static async update(id: number, dados: Partial<ScheduledRoutine>): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }
    
    await routine.update(dados);
    await routine.reload();
    
    return routine;
  }

  /**
   * Deletar rotina
   */
  static async delete(id: number): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }
    
    await routine.destroy();
    
    return routine;
  }
}

