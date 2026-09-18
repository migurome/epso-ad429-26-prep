import { BoardView } from '../components/BoardView'
import { BOARD } from '../data/board.generated'

// El tablón se importa tal cual, sin `import()` dinámico: son unos pocos kB, y
// partirlo en su propio chunk costaría una petición más para ahorrar menos de
// lo que pesa una sola figura del banco de abstracto.
export function BoardPage() {
  return <BoardView board={BOARD} />
}
