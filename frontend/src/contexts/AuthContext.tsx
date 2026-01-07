import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, setToken, removeToken, getToken, LoginRequest, RegisterRequest } from '../services/api'

interface AuthUser {
  user_id: string
  username: string
  nickname: string
  avatar?: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化时检查是否已有 token
  useEffect(() => {
    const initAuth = () => {
      const token = getToken()
      const savedUser = localStorage.getItem('user')

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch {
          // 无效的用户数据，清除
          removeToken()
          localStorage.removeItem('user')
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data)

    if (response.success) {
      setToken(response.access_token)
      const authUser: AuthUser = {
        user_id: response.user_id,
        username: response.username,
        nickname: response.nickname,
        avatar: response.avatar,
      }
      setUser(authUser)
      localStorage.setItem('user', JSON.stringify(authUser))
    } else {
      throw new Error(response.message || 'Login failed')
    }
  }

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data)

    if (response.success) {
      setToken(response.access_token)
      const authUser: AuthUser = {
        user_id: response.user_id,
        username: response.username,
        nickname: response.nickname,
        avatar: response.avatar,
      }
      setUser(authUser)
      localStorage.setItem('user', JSON.stringify(authUser))
    } else {
      throw new Error(response.message || 'Registration failed')
    }
  }

  const logout = () => {
    removeToken()
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
