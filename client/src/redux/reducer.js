import * as actionTypes from "./actions/types";
const initialState = {
  token: null,
  email: null,
  userId: null,
  error: null,
  loading: false,
  authorized: false,
  isAdmin: false,
  registered: false,
  expiresIn: null,
  products: [],
  cartProducts: [],
  discounts: [],
  cartTotal: 0,
  discountedCartTotal: 0,
  cartQuantity: 0,
  cartIsOpen: false,
  msg: ""
};

const updateObject = (oldObject, updatedProperties) => {
    return {
        ...oldObject,
        ...updatedProperties
    };
};

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

const signUpStart = (state, action) => {
  return updateObject(state, { loading: true });
};

const signUpSuccess = (state, action) => {
  return updateObject(state, {
    token: action.token,
    expiresIn: action.expiresIn,
    userId: action.userId,
    email: action.email,
    isAdmin: action.isAdmin,
    error: null,
    loading: false,
    authorized: true
  });
};

const signUpFail = (state, action) => {
  return updateObject(state, {
    msg: "signup error",
    error: action.error,
    loading: false
  });
};

const signInStart = (state, action) => {
  return updateObject(state, { error: null, loading: true });
};

const signInSuccess = (state, action) => {
  return updateObject(state, {
    token: action.token,
    expiresIn: action.expiresIn,
    userId: action.userId,
    email: action.email,
    isAdmin: action.isAdmin,
    error: null,
    loading: false,
    authorized: true
  });
};

const signInFail = (state, action) => {
  return updateObject(state, {
    error: action.error,
    loading: false
  });
};

const checkAuthTimeOut = (state, action) => {
  return updateObject(state, {
    token: null,
    userId: null,
    authorized: false,
    loading: false
  });
};

const signOutStart = (state, action) => {
  return updateObject(initialState, {
    loading: true
  });
};

const signOutSuccess = (state, action) => {
  return initialState;
};

const loadCart = (state, action) => {
  return updateObject(state, {
    cartProducts: action.cartProducts,
    products: action.products
  });
};


const reducer = (state = initialState, action) => {
  switch (action.type) {
    case actionTypes.SIGNUP_START:
      return signUpStart(state, action);
    case actionTypes.SIGNUP_SUCCESS:
      return signUpSuccess(state, action);
    case actionTypes.SIGNUP_FAIL:
      return signUpFail(state, action);
    case actionTypes.SIGNIN_START:
      return signInStart(state, action);
    case actionTypes.SIGNIN_SUCCESS:
      return signInSuccess(state, action);
    case actionTypes.SIGNIN_FAIL:
      return signInFail(state, action);
    case actionTypes.CHECK_AUTH_TIMEOUT:
      return checkAuthTimeOut(state, action);
    case actionTypes.SIGNOUT:
      return signOutStart(state, action);
    case actionTypes.SIGNOUT_SUCCESS:
      return signOutSuccess(state, action);

    case actionTypes.GET_PRODUCTS:
      return updateObject(state, {products: action.products});
    case actionTypes.APPLY_DISCOUNT:
      return updateObject(state, {discounts: action.discounts});
    case actionTypes.CREATE_PRODUCT:
      return updateObject(state, {products: action.products})
    case actionTypes.UPDATE_PRODUCT:
      return updateObject(state, {products: action.products})
    case actionTypes.UPDATE_REMAINING_PRODUCTS:
      const products = deepCopy(state.products);
      products[action.product.index] = action.product;
      return {...state, products: products};

    case actionTypes.LOAD_CART:
      return loadCart(state, action);
    case actionTypes.ADD_PRODUCT:
      return {
        ...state,
        cartProducts: action.cartProducts
      };
    case actionTypes.SUBTRACT_PRODUCT:
      return {
        ...state,
        cartProducts: action.cartProducts
      };
    case actionTypes.REMOVE_PRODUCT:
      return {
        ...state,
        cartProducts: action.cartProducts
      };
    case actionTypes.UPDATE_CART:
      return updateObject(state, {
        discountedCartTotal: action.discountedCartTotal,
        cartTotal: action.cartTotal,
        cartQuantity: action.cartQuantity,
      });
    case actionTypes.EMPTY_CART:
      return updateObject(state, {
        discountedCartTotal: 0,
        cartTotal: 0,
        cartQuantity: 0,
        cartProducts: [],
        cartIsOpen: false,
      })
    case actionTypes.OPEN_CART:
      return updateObject(state, {cartIsOpen: action.cartIsOpen});
    case actionTypes.CLOSE_CART:
      return updateObject(state, {cartIsOpen: action.cartIsOpen});
    case actionTypes.GET_USERS:
      return state;
    case actionTypes.GET_ORDERS:
      return state;
    default:
      return state;
  }
};

export default reducer;
