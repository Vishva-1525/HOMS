import { createContext, useContext, type ReactNode } from 'react'
import { useStudentData, type StudentDataValue } from '@/hooks/useStudentData'

const StudentDataContext = createContext<StudentDataValue | null>(null)

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const value = useStudentData()
  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>
}

export function useStudentDataContext(): StudentDataValue {
  const context = useContext(StudentDataContext)
  if (!context) {
    throw new Error('useStudentDataContext must be used within StudentDataProvider')
  }
  return context
}
